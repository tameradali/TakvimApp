using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TakvimApp.Api.Services;
using TakvimApp.Domain;
using TakvimApp.Domain.Entities;
using TakvimApp.Domain.Interfaces;

namespace TakvimApp.Api.Controllers;

[ApiController]
[Route("api/gelir")]
[Authorize]
public class GelirController(
    IEgitimEtkinligiRepository etkinlikRepo,
    IBeklenenEgitimRepository beklenenRepo,
    GelirHesaplamaServisi gelirServisi,
    AktifKullaniciServisi aktifKullanici) : ControllerBase
{
    [HttpGet("aylik")]
    public async Task<IActionResult> AylikGelir([FromQuery] int ay, [FromQuery] int yil)
    {
        if (ay < 1 || ay > 12) return BadRequest("Geçersiz ay.");

        var ayBaslangici = new DateTime(yil, ay, 1);
        var ayBitisi     = ayBaslangici.AddMonths(1).AddDays(-1);

        var etkinlikler = await etkinlikRepo.AralikGetirAsync(aktifKullanici.KullaniciId, ayBaslangici, ayBitisi);
        var beklenenler = await beklenenRepo.AralikGetirAsync(aktifKullanici.KullaniciId, ayBaslangici, ayBitisi);

        var sonuc = gelirServisi.HesaplaAylik(ay, yil, etkinlikler, beklenenler);
        return Ok(sonuc);
    }

    [HttpGet("yillik")]
    public async Task<IActionResult> YillikGelir([FromQuery] int yil)
    {
        var sonuclar = new List<object>();

        for (int ay = 1; ay <= 12; ay++)
        {
            var ayBaslangici = new DateTime(yil, ay, 1);
            var ayBitisi     = ayBaslangici.AddMonths(1).AddDays(-1);

            var etkinlikler = await etkinlikRepo.AralikGetirAsync(aktifKullanici.KullaniciId, ayBaslangici, ayBitisi);
            var beklenenler = await beklenenRepo.AralikGetirAsync(aktifKullanici.KullaniciId, ayBaslangici, ayBitisi);

            sonuclar.Add(gelirServisi.HesaplaAylik(ay, yil, etkinlikler, beklenenler));
        }

        return Ok(sonuclar);
    }

    [HttpGet("kurum-bazli")]
    public async Task<IActionResult> KurumBazliRapor([FromQuery] int yil)
    {
        var dict  = new Dictionary<string, KurumData>();
        var bos   = new List<BeklenenEgitim>();
        var bugun = DateTime.UtcNow.Date;
        var yarin = bugun.AddDays(1);

        for (int ay = 1; ay <= 12; ay++)
        {
            var ayBaslangici = new DateTime(yil, ay, 1);
            var ayBitisi     = ayBaslangici.AddMonths(1).AddDays(-1);
            var etkinlikler  = await etkinlikRepo.AralikGetirAsync(aktifKullanici.KullaniciId, ayBaslangici, ayBitisi);
            var sonuc        = gelirServisi.HesaplaAylik(ay, yil, etkinlikler, bos);

            // Gerçekleşen günler
            foreach (var k in sonuc.EtkinlikDetaylari)
            {
                if (k.TamamlananGunSayisi <= 0) continue;
                var key = k.KurumId?.ToString() ?? "__yok__";
                if (!dict.TryGetValue(key, out var data))
                {
                    data = new KurumData(k.KurumId, k.KurumAdi ?? "Belirsiz");
                    dict[key] = data;
                }
                data.AyGunler[ay - 1]   += k.TamamlananGunSayisi;
                data.AyGelirler[ay - 1] += k.ToplamGelir;
            }

            // Planlanan günler (gelecek günler, Toplantı hariç)
            foreach (var e in etkinlikler.Where(e => e.EtkinlikTuru != "Toplanti"))
            {
                // plStart = MAX(baslangic, MAX(yarin, ayBaslangici))
                var plStart = e.BaslangicTarihi.Date;
                if (plStart < ayBaslangici) plStart = ayBaslangici;
                if (plStart < yarin)        plStart = yarin;

                // plEnd = MIN(bitisTarihi, ayBitisi+1) — iCal DTEND exclusive
                var plEnd = e.BitisTarihi.Date < ayBitisi.AddDays(1)
                    ? e.BitisTarihi.Date
                    : ayBitisi.AddDays(1);

                if (plEnd <= plStart) continue;
                var gunSayisi = (plEnd - plStart).Days;
                if (gunSayisi <= 0) continue;

                var key = e.KurumId?.ToString() ?? "__yok__";
                if (!dict.TryGetValue(key, out var data))
                {
                    data = new KurumData(e.KurumId, e.KurumAdi ?? "Belirsiz");
                    dict[key] = data;
                }
                data.AyPlanlananGunler[ay - 1] += gunSayisi;
            }
        }

        var sonuclar = dict.Values
            .OrderByDescending(d => d.ToplamGelir + d.PlanlananToplamGun)
            .Select(d => new
            {
                kurumId            = d.KurumId,
                kurumAdi           = d.KurumAdi,
                toplamGun          = d.ToplamGun,
                toplamGelir        = d.ToplamGelir,
                planlananToplamGun = d.PlanlananToplamGun,
                aylar              = Enumerable.Range(0, 12).Select(i => new
                {
                    ay           = i + 1,
                    gunSayisi    = d.AyGunler[i],
                    toplamGelir  = d.AyGelirler[i],
                    planlananGun = d.AyPlanlananGunler[i],
                }).ToList(),
            });

        return Ok(sonuclar);
    }

    private sealed class KurumData(int? kurumId, string kurumAdi)
    {
        public int?      KurumId            { get; } = kurumId;
        public string    KurumAdi           { get; } = kurumAdi;
        public int[]     AyGunler           { get; } = new int[12];
        public decimal[] AyGelirler         { get; } = new decimal[12];
        public int[]     AyPlanlananGunler  { get; } = new int[12];
        public int       ToplamGun          => AyGunler.Sum();
        public decimal   ToplamGelir        => AyGelirler.Sum();
        public int       PlanlananToplamGun => AyPlanlananGunler.Sum();
    }
}
