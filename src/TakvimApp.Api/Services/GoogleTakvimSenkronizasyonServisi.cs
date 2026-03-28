using Google.Apis.Auth.OAuth2;
using Google.Apis.Calendar.v3;
using Google.Apis.Calendar.v3.Data;
using Google.Apis.Services;
using TakvimApp.Domain.Entities;
using TakvimApp.Domain.Interfaces;

namespace TakvimApp.Api.Services;

public class GoogleTakvimSenkronizasyonServisi(
    IEgitimEtkinligiRepository etkinlikRepo,
    IGoogleTakvimHesabiRepository hesapRepo)
{
    public async Task SenkronizeEtAsync(GoogleTakvimHesabi hesap)
    {
#pragma warning disable CS0618
        using var jsonStream = new MemoryStream(System.Text.Encoding.UTF8.GetBytes(hesap.ServisHesabiJson));
        var credential = GoogleCredential
            .FromStream(jsonStream)
            .CreateScoped(CalendarService.Scope.CalendarReadonly);
#pragma warning restore CS0618

        var service = new CalendarService(new BaseClientService.Initializer
        {
            HttpClientInitializer = credential,
            ApplicationName       = "TakvimApp"
        });

        var tumEtkinlikler = new List<Event>();
        var request        = service.Events.List("primary");
        request.SingleEvents = true;
        request.OrderBy      = EventsResource.ListRequest.OrderByEnum.StartTime;

        do
        {
            var sonuc = await request.ExecuteAsync();
            if (sonuc.Items != null)
                tumEtkinlikler.AddRange(sonuc.Items);
            request.PageToken = sonuc.NextPageToken;
        }
        while (!string.IsNullOrEmpty(request.PageToken));

        foreach (var evt in tumEtkinlikler)
        {
            if (string.IsNullOrEmpty(evt.Id)) continue;

            var baslangic = ParseGoogleDate(evt.Start);
            var bitis     = ParseGoogleDate(evt.End);

            var etkinlik = new EgitimEtkinligi
            {
                HesapId          = hesap.Id,
                GoogleEtkinlikId = evt.Id,
                Baslik           = evt.Summary ?? "(başlıksız)",
                BaslangicTarihi  = baslangic,
                BitisTarihi      = bitis,
                Aciklama         = evt.Description,
            };

            await etkinlikRepo.EkleVeyaGuncelleAsync(etkinlik);
        }

        await hesapRepo.SonSenkronizasyonGuncelleAsync(hesap.Id, DateTime.UtcNow);
    }

    private static DateTime ParseGoogleDate(EventDateTime? dt)
    {
        if (dt is null) return DateTime.UtcNow;

        if (dt.DateTimeDateTimeOffset.HasValue)
            return dt.DateTimeDateTimeOffset.Value.UtcDateTime;

        // Tam gün etkinlik: dt.Date = "2026-03-28"
        if (!string.IsNullOrEmpty(dt.Date))
            return DateTime.Parse(dt.Date, null, System.Globalization.DateTimeStyles.RoundtripKind);

        return DateTime.UtcNow;
    }
}
