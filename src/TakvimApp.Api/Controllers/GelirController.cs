using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TakvimApp.Api.Services;
using TakvimApp.Domain;
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
}
