using TakvimApp.Domain.Entities;
using TakvimApp.Domain.Interfaces;

namespace TakvimApp.Data.Repositories;

public class GoogleTakvimHesabiRepository(VeritabaniYonetici db) : IGoogleTakvimHesabiRepository
{
    private static GoogleTakvimHesabi MapRow(System.Data.Common.DbDataReader r) => new()
    {
        Id                = r.GetInt32(0),
        KullaniciId       = r.GetInt32(1),
        HesapAdi          = r.GetString(2),
        ServisHesabiJson  = r.GetString(3),
        AktifMi           = r.GetBoolean(4),
        SonSenkronizasyon = r.IsDBNull(5) ? null : r.GetDateTime(5),
    };

    private const string SelectSql = @"
        SELECT Id, KullaniciId, HesapAdi, ServisHesabiJson, AktifMi, SonSenkronizasyon
        FROM GoogleTakvimHesaplari";

    public async Task<List<GoogleTakvimHesabi>> TumunuGetirAsync(int kullaniciId)
    {
        using var baglanti = db.BaglantiAc();
        using var komut    = baglanti.CreateCommand();
        komut.CommandText  = SelectSql + " WHERE KullaniciId = @kid ORDER BY HesapAdi";
        komut.Parameters.AddWithValue("@kid", kullaniciId);
        using var r  = await komut.ExecuteReaderAsync();
        var liste    = new List<GoogleTakvimHesabi>();
        while (await r.ReadAsync()) liste.Add(MapRow(r));
        return liste;
    }

    public async Task<List<GoogleTakvimHesabi>> TumAktifGetirAsync()
    {
        using var baglanti = db.BaglantiAc();
        using var komut    = baglanti.CreateCommand();
        komut.CommandText  = SelectSql + " WHERE AktifMi = TRUE ORDER BY HesapAdi";
        using var r  = await komut.ExecuteReaderAsync();
        var liste    = new List<GoogleTakvimHesabi>();
        while (await r.ReadAsync()) liste.Add(MapRow(r));
        return liste;
    }

    public async Task<GoogleTakvimHesabi?> GetirAsync(int id)
    {
        using var baglanti = db.BaglantiAc();
        using var komut    = baglanti.CreateCommand();
        komut.CommandText  = SelectSql + " WHERE Id = @id";
        komut.Parameters.AddWithValue("@id", id);
        using var r = await komut.ExecuteReaderAsync();
        if (!await r.ReadAsync()) return null;
        return MapRow(r);
    }

    public async Task<int> EkleAsync(GoogleTakvimHesabi hesap)
    {
        using var baglanti = db.BaglantiAc();
        using var komut    = baglanti.CreateCommand();
        komut.CommandText  = @"
            INSERT INTO GoogleTakvimHesaplari (KullaniciId, HesapAdi, ServisHesabiJson, AktifMi)
            VALUES (@kid, @ad, @json, @aktif)
            RETURNING Id";
        komut.Parameters.AddWithValue("@kid",   hesap.KullaniciId);
        komut.Parameters.AddWithValue("@ad",    hesap.HesapAdi);
        komut.Parameters.AddWithValue("@json",  hesap.ServisHesabiJson);
        komut.Parameters.AddWithValue("@aktif", hesap.AktifMi);
        return (int)(await komut.ExecuteScalarAsync())!;
    }

    public async Task GuncelleAsync(GoogleTakvimHesabi hesap)
    {
        using var baglanti = db.BaglantiAc();
        using var komut    = baglanti.CreateCommand();
        komut.CommandText  = @"
            UPDATE GoogleTakvimHesaplari
            SET HesapAdi = @ad, ServisHesabiJson = @json, AktifMi = @aktif
            WHERE Id = @id";
        komut.Parameters.AddWithValue("@ad",    hesap.HesapAdi);
        komut.Parameters.AddWithValue("@json",  hesap.ServisHesabiJson);
        komut.Parameters.AddWithValue("@aktif", hesap.AktifMi);
        komut.Parameters.AddWithValue("@id",    hesap.Id);
        await komut.ExecuteNonQueryAsync();
    }

    public async Task SilAsync(int id)
    {
        using var baglanti = db.BaglantiAc();
        using var komut    = baglanti.CreateCommand();
        komut.CommandText  = "DELETE FROM GoogleTakvimHesaplari WHERE Id = @id";
        komut.Parameters.AddWithValue("@id", id);
        await komut.ExecuteNonQueryAsync();
    }

    public async Task SonSenkronizasyonGuncelleAsync(int id, DateTime zaman)
    {
        using var baglanti = db.BaglantiAc();
        using var komut    = baglanti.CreateCommand();
        komut.CommandText  = "UPDATE GoogleTakvimHesaplari SET SonSenkronizasyon = @z WHERE Id = @id";
        komut.Parameters.AddWithValue("@z",  zaman);
        komut.Parameters.AddWithValue("@id", id);
        await komut.ExecuteNonQueryAsync();
    }
}
