using TakvimApp.Domain.Entities;
using TakvimApp.Domain.Interfaces;

namespace TakvimApp.Data.Repositories;

public class KurumRepository(VeritabaniYonetici db) : IKurumRepository
{
    private static Kurum MapRow(System.Data.Common.DbDataReader r) => new()
    {
        Id          = r.GetInt32(0),
        KullaniciId = r.GetInt32(1),
        Ad          = r.GetString(2),
        Notlar      = r.IsDBNull(3) ? null : r.GetString(3),
    };

    public async Task<List<Kurum>> TumunuGetirAsync(int kullaniciId)
    {
        using var baglanti = db.BaglantiAc();
        using var komut    = baglanti.CreateCommand();
        komut.CommandText  = "SELECT Id, KullaniciId, Ad, Notlar FROM Kurumlar WHERE KullaniciId = @kid ORDER BY Ad";
        komut.Parameters.AddWithValue("@kid", kullaniciId);
        using var r   = await komut.ExecuteReaderAsync();
        var liste     = new List<Kurum>();
        while (await r.ReadAsync()) liste.Add(MapRow(r));
        return liste;
    }

    public async Task<int> EkleAsync(Kurum kurum)
    {
        using var baglanti = db.BaglantiAc();
        using var komut    = baglanti.CreateCommand();
        komut.CommandText  = @"
            INSERT INTO Kurumlar (KullaniciId, Ad, Notlar)
            VALUES (@kid, @ad, @notlar)
            RETURNING Id";
        komut.Parameters.AddWithValue("@kid",    kurum.KullaniciId);
        komut.Parameters.AddWithValue("@ad",     kurum.Ad);
        komut.Parameters.AddWithValue("@notlar", (object?)kurum.Notlar ?? DBNull.Value);
        return (int)(await komut.ExecuteScalarAsync())!;
    }

    public async Task GuncelleAsync(Kurum kurum)
    {
        using var baglanti = db.BaglantiAc();
        using var komut    = baglanti.CreateCommand();
        komut.CommandText  = @"
            UPDATE Kurumlar SET Ad = @ad, Notlar = @notlar
            WHERE Id = @id AND KullaniciId = @kid";
        komut.Parameters.AddWithValue("@ad",     kurum.Ad);
        komut.Parameters.AddWithValue("@notlar", (object?)kurum.Notlar ?? DBNull.Value);
        komut.Parameters.AddWithValue("@id",     kurum.Id);
        komut.Parameters.AddWithValue("@kid",    kurum.KullaniciId);
        await komut.ExecuteNonQueryAsync();
    }

    public async Task SilAsync(int id, int kullaniciId)
    {
        using var baglanti = db.BaglantiAc();
        using var komut    = baglanti.CreateCommand();
        komut.CommandText  = "DELETE FROM Kurumlar WHERE Id = @id AND KullaniciId = @kid";
        komut.Parameters.AddWithValue("@id",  id);
        komut.Parameters.AddWithValue("@kid", kullaniciId);
        await komut.ExecuteNonQueryAsync();
    }
}
