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
        var dict = new Dictionary<string, KurumData>();
        var bos  = new List<BeklenenEgitim>();

        for (int ay = 1; ay <= 12; ay++)
        {
            var ayBaslangici = new DateTime(yil, ay, 1);
            var ayBitisi     = ayBaslangici.AddMonths(1).AddDays(-1);
            var etkinlikler  = await etkinlikRepo.AralikGetirAsync(aktifKullanici.KullaniciId, ayBaslangici, ayBitisi);
            var sonuc        = gelirServisi.HesaplaAylik(ay, yil, etkinlikler, bos);

            foreach (var k in sonuc.EtkinlikDetaylari)
            {
                if (k.TamamlananGunSayisi <= 0) continue;
                var key = k.KurumId?.ToString() ?? "__yok__";
                if (!dict.TryGetValue(key, out var data))
                {
                    data = new KurumData(k.KurumId, k.KurumAdi ?? "Belirsiz");
                    dict[key] = data;
                }
                data.AyGunler[ay - 1]    += k.TamamlananGunSayisi;
                data.AyGelirler[ay - 1]  += k.ToplamGelir;
            }
        }

        var sonuclar = dict.Values
            .OrderByDescending(d => d.ToplamGelir)
            .Select(d => new
            {
                kurumId     = d.KurumId,
                kurumAdi    = d.KurumAdi,
                toplamGun   = d.ToplamGun,
                toplamGelir = d.ToplamGelir,
                aylar       = Enumerable.Range(0, 12).Select(i => new
                {
                    ay          = i + 1,
                    gunSayisi   = d.AyGunler[i],
                    toplamGelir = d.AyGelirler[i],
                }).ToList(),
            });

        return Ok(sonuclar);
    }

    private sealed class KurumData(int? kurumId, string kurumAdi)
    {
        public int?      KurumId    { get; } = kurumId;
        public string    KurumAdi   { get; } = kurumAdi;
        public int[]     AyGunler   { get; } = new int[12];
        public decimal[] AyGelirler { get; } = new decimal[12];
        public int       ToplamGun   => AyGunler.Sum();
        public decimal   ToplamGelir => AyGelirler.Sum();
    }
}
