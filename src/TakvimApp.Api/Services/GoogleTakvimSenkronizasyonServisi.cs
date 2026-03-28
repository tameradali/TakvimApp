using TakvimApp.Domain.Entities;
using TakvimApp.Domain.Interfaces;

namespace TakvimApp.Api.Services;

/// <summary>
/// Google Calendar'ın gizli iCal URL'sini çekip parse eder.
/// Kullanıcı: Google Calendar → Ayarlar → "Gizli adres iCal formatında" → URL kopyala
/// </summary>
public class GoogleTakvimSenkronizasyonServisi(
    IEgitimEtkinligiRepository etkinlikRepo,
    IGoogleTakvimHesabiRepository hesapRepo,
    IHttpClientFactory httpClientFactory)
{
    public async Task SenkronizeEtAsync(GoogleTakvimHesabi hesap)
    {
        var icsUrl = hesap.ServisHesabiJson?.Trim();
        if (string.IsNullOrEmpty(icsUrl))
            throw new InvalidOperationException("iCal URL boş olamaz.");

        var http = httpClientFactory.CreateClient("ics");
        var icsContent = await http.GetStringAsync(icsUrl);

        var etkinlikler = IcsParser.Parse(icsContent);

        foreach (var evt in etkinlikler)
        {
            var etkinlik = new EgitimEtkinligi
            {
                HesapId          = hesap.Id,
                GoogleEtkinlikId = evt.Uid,
                Baslik           = evt.Summary,
                BaslangicTarihi  = evt.Start,
                BitisTarihi      = evt.End,
                Aciklama         = evt.Description,
            };
            await etkinlikRepo.EkleVeyaGuncelleAsync(etkinlik);
        }

        await hesapRepo.SonSenkronizasyonGuncelleAsync(hesap.Id, DateTime.UtcNow);
    }
}

internal class IcsEvent
{
    public string Uid     { get; set; } = "";
    public string Summary { get; set; } = "(başlıksız)";
    public string? Description { get; set; }
    public DateTime Start { get; set; }
    public DateTime End   { get; set; }
}

internal static class IcsParser
{
    public static List<IcsEvent> Parse(string content)
    {
        var result = new List<IcsEvent>();
        // iCal satırları CRLF ile ayrılır; continuation lines boşluk/tab ile başlar
        var lines = UnfoldLines(content);

        IcsEvent? current = null;

        foreach (var line in lines)
        {
            if (line == "BEGIN:VEVENT")
            {
                current = new IcsEvent();
                continue;
            }
            if (line == "END:VEVENT" && current != null)
            {
                // Bitiş tarihi yoksa başlangıç + 1 gün
                if (current.End == default)
                    current.End = current.Start.AddDays(1);
                result.Add(current);
                current = null;
                continue;
            }

            if (current == null) continue;

            var colonIdx = line.IndexOf(':');
            if (colonIdx < 0) continue;

            var key   = line[..colonIdx].ToUpperInvariant();
            var value = line[(colonIdx + 1)..];

            // Parameterli key: DTSTART;VALUE=DATE → DTSTART
            var semicolonIdx = key.IndexOf(';');
            var baseKey = semicolonIdx >= 0 ? key[..semicolonIdx] : key;
            var hasDateOnly = key.Contains("VALUE=DATE") && !key.Contains("DATE-TIME");

            switch (baseKey)
            {
                case "UID":
                    current.Uid = value;
                    break;
                case "SUMMARY":
                    current.Summary = UnescapeIcs(value);
                    break;
                case "DESCRIPTION":
                    current.Description = UnescapeIcs(value);
                    break;
                case "DTSTART":
                    current.Start = ParseIcsDate(value, hasDateOnly);
                    break;
                case "DTEND":
                    current.End = ParseIcsDate(value, hasDateOnly);
                    break;
            }
        }

        return result;
    }

    private static List<string> UnfoldLines(string content)
    {
        var rawLines = content.Replace("\r\n", "\n").Replace("\r", "\n").Split('\n');
        var unfolded = new List<string>();

        foreach (var raw in rawLines)
        {
            if (raw.Length > 0 && (raw[0] == ' ' || raw[0] == '\t') && unfolded.Count > 0)
                unfolded[^1] += raw[1..]; // continuation
            else
                unfolded.Add(raw);
        }
        return unfolded;
    }

    private static DateTime ParseIcsDate(string value, bool dateOnly)
    {
        value = value.Trim();
        try
        {
            if (dateOnly || value.Length == 8)
            {
                // YYYYMMDD
                return DateTime.ParseExact(value, "yyyyMMdd",
                    System.Globalization.CultureInfo.InvariantCulture,
                    System.Globalization.DateTimeStyles.None);
            }
            if (value.EndsWith('Z'))
            {
                // YYYYMMDDTHHMMSSZ — UTC
                return DateTime.ParseExact(value, "yyyyMMddTHHmmssZ",
                    System.Globalization.CultureInfo.InvariantCulture,
                    System.Globalization.DateTimeStyles.AssumeUniversal | System.Globalization.DateTimeStyles.AdjustToUniversal);
            }
            // YYYYMMDDTHHMMSS — local
            return DateTime.ParseExact(value, "yyyyMMddTHHmmss",
                System.Globalization.CultureInfo.InvariantCulture,
                System.Globalization.DateTimeStyles.None);
        }
        catch
        {
            return DateTime.UtcNow;
        }
    }

    private static string UnescapeIcs(string value) =>
        value.Replace("\\n", "\n").Replace("\\,", ",").Replace("\\;", ";").Replace("\\\\", "\\");
}
