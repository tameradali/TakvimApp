using TakvimApp.Domain.Entities;
using TakvimApp.Domain.Interfaces;

namespace TakvimApp.Data.Repositories;

public class EgitimEtkinligiRepository(VeritabaniYonetici db) : IEgitimEtkinligiRepository
{
    private static EgitimEtkinligi MapRow(System.Data.Common.DbDataReader r) => new()
    {
        Id               = r.GetInt32(0),
        HesapId          = r.GetInt32(1),
        GoogleEtkinlikId = r.GetString(2),
        Baslik           = r.GetString(3),
        BaslangicTarihi  = r.GetDateTime(4),
        BitisTarihi      = r.GetDateTime(5),
        Aciklama         = r.IsDBNull(6)  ? null : r.GetString(6),
        GunlukFiyat      = r.IsDBNull(7)  ? null : r.GetDecimal(7),
        Yer              = r.IsDBNull(8)  ? null : r.GetString(8),
        EtkinlikTuru     = r.IsDBNull(9)  ? "Egitim" : r.GetString(9),
        EgitimTipi       = r.IsDBNull(10) ? null : r.GetString(10),
        Masraf           = r.IsDBNull(11) ? null : r.GetDecimal(11),
        KurumId          = r.IsDBNull(12) ? null : r.GetInt32(12),
        KurumAdi         = r.IsDBNull(13) ? null : r.GetString(13),
        Sehir            = r.IsDBNull(14) ? null : r.GetString(14),
        ArsivMi          = r.IsDBNull(15) ? false : r.GetBoolean(15),
    };

    private const string SelectSql = @"
        SELECT e.Id, e.HesapId, e.GoogleEtkinlikId, e.Baslik,
               e.BaslangicTarihi, e.BitisTarihi, e.Aciklama, e.GunlukFiyat,
               e.Yer, e.EtkinlikTuru, e.EgitimTipi, e.Masraf,
               e.KurumId, k.Ad AS KurumAdi, e.Sehir, e.ArsivMi
        FROM EgitimEtkinlikleri e
        LEFT JOIN Kurumlar k ON e.KurumId = k.Id";

    public async Task<List<EgitimEtkinligi>> TumunuGetirAsync(int kullaniciId)
    {
        using var baglanti = db.BaglantiAc();
        using var komut    = baglanti.CreateCommand();
        komut.CommandText  = SelectSql + @"
            JOIN GoogleTakvimHesaplari h ON e.HesapId = h.Id
            WHERE h.KullaniciId = @kid AND e.ArsivMi = FALSE
            ORDER BY e.BaslangicTarihi";
        komut.Parameters.AddWithValue("@kid", kullaniciId);
        using var r  = await komut.ExecuteReaderAsync();
        var liste    = new List<EgitimEtkinligi>();
        while (await r.ReadAsync()) liste.Add(MapRow(r));
        return liste;
    }

    public async Task<List<EgitimEtkinligi>> AralikGetirAsync(int kullaniciId, DateTime baslangic, DateTime bitis)
    {
        using var baglanti = db.BaglantiAc();
        using var komut    = baglanti.CreateCommand();
        komut.CommandText  = SelectSql + @"
            JOIN GoogleTakvimHesaplari h ON e.HesapId = h.Id
            WHERE h.KullaniciId = @kid
              AND e.ArsivMi = FALSE
              AND e.BaslangicTarihi <= @bitis
              AND e.BitisTarihi    >= @baslangic
            ORDER BY e.BaslangicTarihi";
        komut.Parameters.AddWithValue("@kid",      kullaniciId);
        komut.Parameters.AddWithValue("@baslangic", baslangic);
        komut.Parameters.AddWithValue("@bitis",     bitis);
        using var r  = await komut.ExecuteReaderAsync();
        var liste    = new List<EgitimEtkinligi>();
        while (await r.ReadAsync()) liste.Add(MapRow(r));
        return liste;
    }

    public async Task<int> EkleVeyaGuncelleAsync(EgitimEtkinligi etkinlik)
    {
        using var baglanti = db.BaglantiAc();
        using var komut    = baglanti.CreateCommand();
        // GunlukFiyat, EtkinlikTuru, EgitimTipi, Masraf, Sehir kasıtlı olarak güncellenmez — kullanıcı girişini korur
        // ArsivMi = FALSE: Google'dan geri gelen event arşivden çıkarılır
        komut.CommandText  = @"
            INSERT INTO EgitimEtkinlikleri
                (HesapId, GoogleEtkinlikId, Baslik, BaslangicTarihi, BitisTarihi, Aciklama, Yer, ArsivMi)
            VALUES (@hesapId, @gid, @baslik, @bs, @bt, @ac, @yer, FALSE)
            ON CONFLICT (HesapId, GoogleEtkinlikId) DO UPDATE
                SET Baslik           = EXCLUDED.Baslik,
                    BaslangicTarihi  = EXCLUDED.BaslangicTarihi,
                    BitisTarihi      = EXCLUDED.BitisTarihi,
                    Aciklama         = EXCLUDED.Aciklama,
                    Yer              = EXCLUDED.Yer,
                    ArsivMi          = FALSE
            RETURNING Id";
        komut.Parameters.AddWithValue("@hesapId", etkinlik.HesapId);
        komut.Parameters.AddWithValue("@gid",     etkinlik.GoogleEtkinlikId);
        komut.Parameters.AddWithValue("@baslik",  etkinlik.Baslik);
        komut.Parameters.AddWithValue("@bs",      etkinlik.BaslangicTarihi);
        komut.Parameters.AddWithValue("@bt",      etkinlik.BitisTarihi);
        komut.Parameters.AddWithValue("@ac",      (object?)etkinlik.Aciklama ?? DBNull.Value);
        komut.Parameters.AddWithValue("@yer",     (object?)etkinlik.Yer ?? DBNull.Value);
        return (int)(await komut.ExecuteScalarAsync())!;
    }

    public async Task FiyatGuncelleAsync(int id, decimal? gunlukFiyat)
    {
        using var baglanti = db.BaglantiAc();
        using var komut    = baglanti.CreateCommand();
        komut.CommandText  = "UPDATE EgitimEtkinlikleri SET GunlukFiyat = @fiyat WHERE Id = @id";
        komut.Parameters.AddWithValue("@fiyat", (object?)gunlukFiyat ?? DBNull.Value);
        komut.Parameters.AddWithValue("@id",    id);
        await komut.ExecuteNonQueryAsync();
    }

    public async Task EtkinlikBilgiGuncelleAsync(int id, decimal? gunlukFiyat, string etkinlikTuru, string? egitimTipi, decimal? masraf, int? kurumId, string? sehir)
    {
        using var baglanti = db.BaglantiAc();
        using var komut    = baglanti.CreateCommand();
        komut.CommandText  = @"
            UPDATE EgitimEtkinlikleri
            SET GunlukFiyat  = @fiyat,
                EtkinlikTuru = @tur,
                EgitimTipi   = @tip,
                Masraf       = @masraf,
                KurumId      = @kurumId,
                Sehir        = @sehir
            WHERE Id = @id";
        komut.Parameters.AddWithValue("@fiyat",   (object?)gunlukFiyat ?? DBNull.Value);
        komut.Parameters.AddWithValue("@tur",      etkinlikTuru);
        komut.Parameters.AddWithValue("@tip",      (object?)egitimTipi ?? DBNull.Value);
        komut.Parameters.AddWithValue("@masraf",   (object?)masraf ?? DBNull.Value);
        komut.Parameters.AddWithValue("@kurumId",  (object?)kurumId ?? DBNull.Value);
        komut.Parameters.AddWithValue("@sehir",    (object?)sehir ?? DBNull.Value);
        komut.Parameters.AddWithValue("@id",       id);
        await komut.ExecuteNonQueryAsync();
    }

    public async Task HesabaGoreTemizleAsync(int hesapId)
    {
        using var baglanti = db.BaglantiAc();
        using var komut    = baglanti.CreateCommand();
        komut.CommandText  = "DELETE FROM EgitimEtkinlikleri WHERE HesapId = @hesapId";
        komut.Parameters.AddWithValue("@hesapId", hesapId);
        await komut.ExecuteNonQueryAsync();
    }

    public async Task<int> EkleManuelAsync(EgitimEtkinligi e, int kullaniciId)
    {
        int hesapId;
        using (var bag1 = db.BaglantiAc())
        {
            using var cmd1 = bag1.CreateCommand();
            cmd1.CommandText = "SELECT Id FROM GoogleTakvimHesaplari WHERE KullaniciId = @kid ORDER BY Id LIMIT 1";
            cmd1.Parameters.AddWithValue("@kid", kullaniciId);
            var result = await cmd1.ExecuteScalarAsync();
            if (result is null) throw new InvalidOperationException("Önce bir Google Takvim hesabı ekleyin.");
            hesapId = (int)result;
        }
        using var bag = db.BaglantiAc();
        using var cmd = bag.CreateCommand();
        cmd.CommandText = @"
            INSERT INTO EgitimEtkinlikleri
                (HesapId, GoogleEtkinlikId, Baslik, BaslangicTarihi, BitisTarihi,
                 GunlukFiyat, EtkinlikTuru, EgitimTipi, Masraf, KurumId, Sehir)
            VALUES (@hesapId, @gid, @baslik, @bs, @bt,
                    @fiyat, @tur, @tip, @masraf, @kurumId, @sehir)
            RETURNING Id";
        cmd.Parameters.AddWithValue("@hesapId", hesapId);
        cmd.Parameters.AddWithValue("@gid",     $"manual-{Guid.NewGuid():N}");
        cmd.Parameters.AddWithValue("@baslik",  e.Baslik);
        cmd.Parameters.AddWithValue("@bs",      e.BaslangicTarihi);
        cmd.Parameters.AddWithValue("@bt",      e.BitisTarihi);
        cmd.Parameters.AddWithValue("@fiyat",   (object?)e.GunlukFiyat ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@tur",     e.EtkinlikTuru);
        cmd.Parameters.AddWithValue("@tip",     (object?)e.EgitimTipi  ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@masraf",  (object?)e.Masraf      ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@kurumId", (object?)e.KurumId     ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@sehir",   (object?)e.Sehir       ?? DBNull.Value);
        return (int)(await cmd.ExecuteScalarAsync())!;
    }

    public async Task TamGuncelleAsync(int id, string baslik, DateTime bs, DateTime bt,
        decimal? gunlukFiyat, string etkinlikTuru, string? egitimTipi, decimal? masraf, int? kurumId, string? sehir)
    {
        using var bag = db.BaglantiAc();
        using var cmd = bag.CreateCommand();
        cmd.CommandText = @"
            UPDATE EgitimEtkinlikleri
            SET Baslik          = @baslik,
                BaslangicTarihi = @bs,
                BitisTarihi     = @bt,
                GunlukFiyat     = @fiyat,
                EtkinlikTuru    = @tur,
                EgitimTipi      = @tip,
                Masraf          = @masraf,
                KurumId         = @kurumId,
                Sehir           = @sehir
            WHERE Id = @id";
        cmd.Parameters.AddWithValue("@baslik",  baslik);
        cmd.Parameters.AddWithValue("@bs",      bs);
        cmd.Parameters.AddWithValue("@bt",      bt);
        cmd.Parameters.AddWithValue("@fiyat",   (object?)gunlukFiyat ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@tur",     etkinlikTuru);
        cmd.Parameters.AddWithValue("@tip",     (object?)egitimTipi  ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@masraf",  (object?)masraf      ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@kurumId", (object?)kurumId     ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@sehir",   (object?)sehir       ?? DBNull.Value);
        cmd.Parameters.AddWithValue("@id",      id);
        await cmd.ExecuteNonQueryAsync();
    }

    public async Task SilAsync(int id, int kullaniciId)
    {
        using var bag = db.BaglantiAc();
        using var cmd = bag.CreateCommand();
        cmd.CommandText = @"
            DELETE FROM EgitimEtkinlikleri e
            USING GoogleTakvimHesaplari h
            WHERE e.Id = @id AND e.HesapId = h.Id AND h.KullaniciId = @kid";
        cmd.Parameters.AddWithValue("@id",  id);
        cmd.Parameters.AddWithValue("@kid", kullaniciId);
        await cmd.ExecuteNonQueryAsync();
    }

    public async Task<List<(int Id, string GoogleEtkinlikId)>> HesaptakiAktifIdleriGetirAsync(int hesapId)
    {
        using var bag = db.BaglantiAc();
        using var cmd = bag.CreateCommand();
        cmd.CommandText = @"
            SELECT Id, GoogleEtkinlikId FROM EgitimEtkinlikleri
            WHERE HesapId = @hesapId AND ArsivMi = FALSE
              AND GoogleEtkinlikId NOT LIKE 'manual-%'";
        cmd.Parameters.AddWithValue("@hesapId", hesapId);
        using var r  = await cmd.ExecuteReaderAsync();
        var liste    = new List<(int, string)>();
        while (await r.ReadAsync()) liste.Add((r.GetInt32(0), r.GetString(1)));
        return liste;
    }

    public async Task ArsivleAsync(IEnumerable<int> ids)
    {
        var idList = ids.ToArray();
        if (idList.Length == 0) return;
        using var bag = db.BaglantiAc();
        using var cmd = bag.CreateCommand();
        cmd.CommandText = "UPDATE EgitimEtkinlikleri SET ArsivMi = TRUE WHERE Id = ANY(@ids)";
        cmd.Parameters.AddWithValue("@ids", idList);
        await cmd.ExecuteNonQueryAsync();
    }
}
