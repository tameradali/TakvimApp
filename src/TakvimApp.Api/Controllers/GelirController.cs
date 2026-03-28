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
    IBeklenenEgitimRepository  beklenenRepo,
    IKurumRepository           kurumRepo,
    GelirHesaplamaServisi      gelirServisi,
    AktifKullaniciServisi      aktifKullanici) : ControllerBase
{
    [HttpGet("aylik")]
    public async Task<IActionResult> AylikGelir([FromQuery] int ay, [FromQuery] int yil)
    {
        if (ay < 1 || ay > 12) return BadRequest("Geçersiz ay.");

        var ayBaslangici = new DateTime(yil, ay, 1);
        var ayBitisi     = ayBaslangici.AddMonths(1).AddDays(-1);

        var etkinlikler = await etkinlikRepo.AralikGetirAsync(aktifKullanici.KullaniciId, ayBaslangici, ayBitisi);
        // Beklenenler yıl bazlı — boş liste gönder, Gelir.tsx direkt API çağırıyor
        var sonuc = gelirServisi.HesaplaAylik(ay, yil, etkinlikler, new List<BeklenenEgitim>());
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
            sonuclar.Add(gelirServisi.HesaplaAylik(ay, yil, etkinlikler, new List<BeklenenEgitim>()));
        }

        return Ok(sonuclar);
    }

    [HttpGet("kurum-bazli")]
    public async Task<IActionResult> KurumBazliRapor([FromQuery] int yil)
    {
        var dict  = new Dictionary<string, KurumData>();
        var bugun = DateTime.UtcNow.Date;
        var yarin = bugun.AddDays(1);

        // Kurum renkleri için lookup
        var kurumlar   = await kurumRepo.TumunuGetirAsync(aktifKullanici.KullaniciId);
        var renkLookup = kurumlar.ToDictionary(k => k.Id.ToString(), k => k.Renk);

        // Tüm kurumları dict'e baştan ekle (veri olmasa bile raporlarda görünsün)
        foreach (var k in kurumlar)
        {
            var key = k.Id.ToString();
            EnsureData(dict, key, k.Id, k.Ad, renkLookup);
        }

        // Gerçekleşen + Planlanan (aylık döngü)
        for (int ay = 1; ay <= 12; ay++)
        {
            var ayBaslangici = new DateTime(yil, ay, 1);
            var ayBitisi     = ayBaslangici.AddMonths(1).AddDays(-1);
            var etkinlikler  = await etkinlikRepo.AralikGetirAsync(aktifKullanici.KullaniciId, ayBaslangici, ayBitisi);
            var sonuc        = gelirServisi.HesaplaAylik(ay, yil, etkinlikler, new List<BeklenenEgitim>());

            // Gerçekleşen
            foreach (var k in sonuc.EtkinlikDetaylari)
            {
                if (k.TamamlananGunSayisi <= 0) continue;
                var key = GetKey(k.KurumId);
                EnsureData(dict, key, k.KurumId, k.KurumAdi, renkLookup);
                dict[key].AyGunler[ay - 1]   += k.TamamlananGunSayisi;
                dict[key].AyGelirler[ay - 1] += k.ToplamGelir;
            }

            // Planlanan gün — tüm eğitimler (fiyatsız dahil, toplantı hariç) → frontend ile senkron
            foreach (var e in etkinlikler.Where(e => e.EtkinlikTuru != "Toplanti"))
            {
                var plStart = e.BaslangicTarihi.Date > ayBaslangici ? e.BaslangicTarihi.Date : ayBaslangici;
                if (plStart < yarin) plStart = yarin;
                var bitisEx = e.BitisTarihi.TimeOfDay == TimeSpan.Zero
                    ? e.BitisTarihi.Date
                    : e.BitisTarihi.Date.AddDays(1);
                var plEnd = bitisEx < ayBitisi.AddDays(1) ? bitisEx : ayBitisi.AddDays(1);
                if (plEnd <= plStart) continue;
                var gun = (plEnd - plStart).Days;
                if (gun <= 0) continue;
                var key = GetKey(e.KurumId);
                EnsureData(dict, key, e.KurumId, e.KurumAdi, renkLookup);
                dict[key].AyPlanlananGunler[ay - 1] += gun;
            }

            // Planlanan gelir — sadece fiyatlı eğitimler
            foreach (var k in sonuc.PlanlananDetaylari)
            {
                if (k.PlanlananGunSayisi <= 0) continue;
                var key = GetKey(k.KurumId);
                EnsureData(dict, key, k.KurumId, k.KurumAdi, renkLookup);
                dict[key].AyPlanlananGelirler[ay - 1] += k.ToplamGelir;
            }
        }

        // Beklenen (yıllık, kurum bazlı toplam) — UTC offset için aralığı genişlet
        var tumBeklenenler = await beklenenRepo.AralikGetirAsync(
            aktifKullanici.KullaniciId,
            new DateTime(yil - 1, 12, 31),          // Dec 31 önceki yıl (UTC+X offset için)
            new DateTime(yil, 12, 31, 23, 59, 59));

        foreach (var b in tumBeklenenler)
        {
            var key = GetKey(b.KurumId);
            EnsureData(dict, key, b.KurumId, b.KurumAdi, renkLookup);
            dict[key].BeklenenGun   += b.BeklenenGunSayisi;
            dict[key].BeklenenGelir += b.BeklenenGunSayisi * b.GunlukFiyat;
        }

        var sonuclar = dict.Values
            .OrderByDescending(d => d.ToplamGelir + d.PlanlananToplamGelir + d.BeklenenGelir)
            .Select(d => new
            {
                kurumId              = d.KurumId,
                kurumAdi             = d.KurumAdi,
                renk                 = d.Renk,
                toplamGun            = d.ToplamGun,
                toplamGelir          = d.ToplamGelir,
                planlananToplamGun   = d.PlanlananToplamGun,
                planlananToplamGelir = d.PlanlananToplamGelir,
                beklenenToplamGun    = d.BeklenenGun,
                beklenenToplamGelir  = d.BeklenenGelir,
                aylar                = Enumerable.Range(0, 12).Select(i => new
                {
                    ay             = i + 1,
                    gunSayisi      = d.AyGunler[i],
                    toplamGelir    = d.AyGelirler[i],
                    planlananGun   = d.AyPlanlananGunler[i],
                    planlananGelir = d.AyPlanlananGelirler[i],
                }).ToList(),
            });

        return Ok(sonuclar);
    }

    private static string GetKey(int? kurumId) => kurumId?.ToString() ?? "__yok__";

    private static void EnsureData(
        Dictionary<string, KurumData> dict, string key,
        int? kurumId, string? kurumAdi,
        Dictionary<string, string?> renkLookup)
    {
        if (dict.ContainsKey(key)) return;
        var renk = kurumId.HasValue && renkLookup.TryGetValue(kurumId.Value.ToString(), out var r) ? r : null;
        dict[key] = new KurumData(kurumId, kurumAdi ?? "Belirsiz", renk);
    }

    private sealed class KurumData(int? kurumId, string kurumAdi, string? renk)
    {
        public int?      KurumId             { get; } = kurumId;
        public string    KurumAdi            { get; } = kurumAdi;
        public string?   Renk                { get; } = renk;
        public int[]     AyGunler            { get; } = new int[12];
        public decimal[] AyGelirler          { get; } = new decimal[12];
        public int[]     AyPlanlananGunler   { get; } = new int[12];
        public decimal[] AyPlanlananGelirler { get; } = new decimal[12];
        public int       BeklenenGun         { get; set; }
        public decimal   BeklenenGelir       { get; set; }
        public int       ToplamGun           => AyGunler.Sum();
        public decimal   ToplamGelir         => AyGelirler.Sum();
        public int       PlanlananToplamGun  => AyPlanlananGunler.Sum();
        public decimal   PlanlananToplamGelir => AyPlanlananGelirler.Sum();
    }
}
