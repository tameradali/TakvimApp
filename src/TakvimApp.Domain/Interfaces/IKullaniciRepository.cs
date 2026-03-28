using TakvimApp.Domain.Entities;

namespace TakvimApp.Domain.Interfaces;

public interface IKullaniciRepository
{
    Task<Kullanici?> GetirAsync(int id);
    Task<Kullanici?> GetByKullaniciAdiAsync(string kullaniciAdi);
    Task<List<Kullanici>> TumunuGetirAsync();
    Task<int> OlusturAsync(Kullanici kullanici);
    Task RolGuncelleAsync(int id, string rol);
    Task SifreGuncelleAsync(int id, string sifreHash);
}
