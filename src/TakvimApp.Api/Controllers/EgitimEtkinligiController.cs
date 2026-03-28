using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TakvimApp.Domain;
using TakvimApp.Domain.Interfaces;

namespace TakvimApp.Api.Controllers;

[ApiController]
[Route("api/egitim-etkinlikleri")]
[Authorize]
public class EgitimEtkinligiController(
    IEgitimEtkinligiRepository repo,
    AktifKullaniciServisi aktifKullanici) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Listele()
    {
        var liste = await repo.TumunuGetirAsync(aktifKullanici.KullaniciId);
        return Ok(liste);
    }

    [HttpGet("aralik")]
    public async Task<IActionResult> AralikGetir([FromQuery] DateTime baslangic, [FromQuery] DateTime bitis)
    {
        var liste = await repo.AralikGetirAsync(aktifKullanici.KullaniciId, baslangic, bitis);
        return Ok(liste);
    }

    [HttpPatch("{id}/fiyat")]
    public async Task<IActionResult> FiyatGuncelle(int id, [FromBody] FiyatGuncelleRequest req)
    {
        await repo.FiyatGuncelleAsync(id, req.GunlukFiyat);
        return NoContent();
    }

    [HttpPatch("{id}/bilgi")]
    public async Task<IActionResult> BilgiGuncelle(int id, [FromBody] BilgiGuncelleRequest req)
    {
        await repo.EtkinlikBilgiGuncelleAsync(id, req.GunlukFiyat, req.EtkinlikTuru, req.EgitimTipi, req.Masraf, req.KurumId);
        return NoContent();
    }

    public record FiyatGuncelleRequest(decimal? GunlukFiyat);
    public record BilgiGuncelleRequest(decimal? GunlukFiyat, string EtkinlikTuru, string? EgitimTipi, decimal? Masraf, int? KurumId);
}
