using TakvimApp.Domain.Entities;

namespace TakvimApp.Domain.Interfaces;

public interface IKurumRepository
{
    Task<List<Kurum>> TumunuGetirAsync(int kullaniciId);
    Task<int>         EkleAsync(Kurum kurum);
    Task              GuncelleAsync(Kurum kurum);
    Task              SilAsync(int id, int kullaniciId);
}
