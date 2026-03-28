using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TakvimApp.Domain;
using TakvimApp.Domain.Entities;
using TakvimApp.Domain.Interfaces;

namespace TakvimApp.Api.Controllers;

[ApiController]
[Route("api/kurumlar")]
[Authorize]
public class KurumController(
    IKurumRepository repo,
    AktifKullaniciServisi aktifKullanici) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Listele()
    {
        var liste = await repo.TumunuGetirAsync(aktifKullanici.KullaniciId);
        return Ok(liste);
    }

    [HttpPost]
    public async Task<IActionResult> Ekle([FromBody] KurumRequest req)
    {
        var kurum = new Kurum
        {
            KullaniciId = aktifKullanici.KullaniciId,
            Ad          = req.Ad,
            Notlar      = req.Notlar,
            Renk        = req.Renk,
            Logo        = req.Logo,
        };
        var id = await repo.EkleAsync(kurum);
        return Ok(new { id });
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Guncelle(int id, [FromBody] KurumRequest req)
    {
        var kurum = new Kurum
        {
            Id          = id,
            KullaniciId = aktifKullanici.KullaniciId,
            Ad          = req.Ad,
            Notlar      = req.Notlar,
            Renk        = req.Renk,
            Logo        = req.Logo,
        };
        await repo.GuncelleAsync(kurum);
        return NoContent();
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Sil(int id)
    {
        await repo.SilAsync(id, aktifKullanici.KullaniciId);
        return NoContent();
    }

    public record KurumRequest(string Ad, string? Notlar, string? Renk, string? Logo);
}
