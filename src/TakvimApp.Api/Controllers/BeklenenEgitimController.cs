using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TakvimApp.Domain;
using TakvimApp.Domain.Entities;
using TakvimApp.Domain.Interfaces;

namespace TakvimApp.Api.Controllers;

[ApiController]
[Route("api/beklenen-egitimler")]
[Authorize]
public class BeklenenEgitimController(
    IBeklenenEgitimRepository repo,
    AktifKullaniciServisi aktifKullanici) : ControllerBase
{
    public record BeklenenEgitimDto(
        string   Baslik,
        DateTime BaslangicTarihi,
        DateTime BitisTarihi,
        decimal  GunlukFiyat,
        string?  Notlar,
        int?     KurumId,
        int      BeklenenGunSayisi = 1);

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

    [HttpGet("{id}")]
    public async Task<IActionResult> Getir(int id)
    {
        var egitim = await repo.GetirAsync(id);
        if (egitim is null) return NotFound();
        return Ok(egitim);
    }

    [HttpPost]
    public async Task<IActionResult> Ekle([FromBody] BeklenenEgitimDto dto)
    {
        var egitim = new BeklenenEgitim
        {
            KullaniciId       = aktifKullanici.KullaniciId,
            Baslik            = dto.Baslik,
            BaslangicTarihi   = dto.BaslangicTarihi,
            BitisTarihi       = dto.BitisTarihi,
            GunlukFiyat       = dto.GunlukFiyat,
            Notlar            = dto.Notlar,
            KurumId           = dto.KurumId,
            BeklenenGunSayisi = dto.BeklenenGunSayisi,
        };
        var id = await repo.EkleAsync(egitim);
        return Ok(new { id });
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Guncelle(int id, [FromBody] BeklenenEgitimDto dto)
    {
        var mevcut = await repo.GetirAsync(id);
        if (mevcut is null) return NotFound();

        mevcut.Baslik            = dto.Baslik;
        mevcut.BaslangicTarihi   = dto.BaslangicTarihi;
        mevcut.BitisTarihi       = dto.BitisTarihi;
        mevcut.GunlukFiyat       = dto.GunlukFiyat;
        mevcut.Notlar            = dto.Notlar;
        mevcut.KurumId           = dto.KurumId;
        mevcut.BeklenenGunSayisi = dto.BeklenenGunSayisi;

        await repo.GuncelleAsync(mevcut);
        return NoContent();
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Sil(int id)
    {
        await repo.SilAsync(id);
        return NoContent();
    }
}
