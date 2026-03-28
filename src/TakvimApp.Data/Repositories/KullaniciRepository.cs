using TakvimApp.Domain.Entities;
using TakvimApp.Domain.Interfaces;

namespace TakvimApp.Data.Repositories;

public class KullaniciRepository(VeritabaniYonetici db) : IKullaniciRepository
{
    private static Kullanici MapRow(System.Data.Common.DbDataReader r) => new()
    {
        Id                = r.GetInt32(0),
        KullaniciAdi      = r.IsDBNull(1) ? "" : r.GetString(1),
        Email             = r.GetString(2),
        AdSoyad           = r.GetString(3),
        SifreHash         = r.IsDBNull(4) ? "" : r.GetString(4),
        OlusturulmaTarihi = r.GetDateTime(5),
        Rol               = r.IsDBNull(6) ? "tenant" : r.GetString(6),
    };

    private const string SelectSql = @"
        SELECT Id, KullaniciAdi, Email, AdSoyad, SifreHash, OlusturulmaTarihi, Rol
        FROM Kullanicilar";

    public async Task<Kullanici?> GetirAsync(int id)
    {
        using var baglanti = db.BaglantiAc();
        using var komut    = baglanti.CreateCommand();
        komut.CommandText  = SelectSql + " WHERE Id = @id";
        komut.Parameters.AddWithValue("@id", id);
        using var r = await komut.ExecuteReaderAsync();
        if (!await r.ReadAsync()) return null;
        return MapRow(r);
    }

    public async Task<Kullanici?> GetByKullaniciAdiAsync(string kullaniciAdi)
    {
        using var baglanti = db.BaglantiAc();
        using var komut    = baglanti.CreateCommand();
        komut.CommandText  = SelectSql + " WHERE LOWER(KullaniciAdi) = LOWER(@ka)";
        komut.Parameters.AddWithValue("@ka", kullaniciAdi);
        using var r = await komut.ExecuteReaderAsync();
        if (!await r.ReadAsync()) return null;
        return MapRow(r);
    }

    public async Task<List<Kullanici>> TumunuGetirAsync()
    {
        using var baglanti = db.BaglantiAc();
        using var komut    = baglanti.CreateCommand();
        komut.CommandText  = SelectSql + " ORDER BY OlusturulmaTarihi";
        using var r  = await komut.ExecuteReaderAsync();
        var liste    = new List<Kullanici>();
        while (await r.ReadAsync()) liste.Add(MapRow(r));
        return liste;
    }

    public async Task<int> OlusturAsync(Kullanici k)
    {
        using var baglanti = db.BaglantiAc();
        using var komut    = baglanti.CreateCommand();
        komut.CommandText  = @"
            INSERT INTO Kullanicilar (KullaniciAdi, Email, AdSoyad, SifreHash, Rol, OlusturulmaTarihi)
            VALUES (@ka, @email, @adsoyad, @sifre, @rol, NOW())
            RETURNING Id";
        komut.Parameters.AddWithValue("@ka",      k.KullaniciAdi);
        komut.Parameters.AddWithValue("@email",   k.Email);
        komut.Parameters.AddWithValue("@adsoyad", k.AdSoyad);
        komut.Parameters.AddWithValue("@sifre",   k.SifreHash);
        komut.Parameters.AddWithValue("@rol",     k.Rol);
        return (int)(await komut.ExecuteScalarAsync())!;
    }

    public async Task RolGuncelleAsync(int id, string rol)
    {
        using var baglanti = db.BaglantiAc();
        using var komut    = baglanti.CreateCommand();
        komut.CommandText  = "UPDATE Kullanicilar SET Rol = @rol WHERE Id = @id";
        komut.Parameters.AddWithValue("@rol", rol);
        komut.Parameters.AddWithValue("@id",  id);
        await komut.ExecuteNonQueryAsync();
    }

    public async Task SifreGuncelleAsync(int id, string sifreHash)
    {
        using var baglanti = db.BaglantiAc();
        using var komut    = baglanti.CreateCommand();
        komut.CommandText  = "UPDATE Kullanicilar SET SifreHash = @h WHERE Id = @id";
        komut.Parameters.AddWithValue("@h",  sifreHash);
        komut.Parameters.AddWithValue("@id", id);
        await komut.ExecuteNonQueryAsync();
    }
}
