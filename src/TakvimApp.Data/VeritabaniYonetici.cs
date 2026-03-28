using System.Security.Cryptography;
using Npgsql;
using TakvimApp.Data.Migration;

namespace TakvimApp.Data;

public class VeritabaniYonetici
{
    private readonly string _baglantiMetni;

    public VeritabaniYonetici(string baglantiMetni)
    {
        _baglantiMetni = baglantiMetni;
        TablolusturEger();
        MigrasyonUygula();
    }

    public NpgsqlConnection BaglantiAc()
    {
        var baglanti = new NpgsqlConnection(_baglantiMetni);
        baglanti.Open();
        return baglanti;
    }

    private bool KolonVarMi(NpgsqlConnection baglanti, string tablo, string kolon)
    {
        using var komut = baglanti.CreateCommand();
        komut.CommandText = @"
            SELECT COUNT(*) FROM information_schema.columns
            WHERE table_schema='public' AND table_name=@tablo AND column_name=@kolon";
        komut.Parameters.AddWithValue("@tablo", tablo.ToLowerInvariant());
        komut.Parameters.AddWithValue("@kolon", kolon.ToLowerInvariant());
        return Convert.ToInt64(komut.ExecuteScalar() ?? 0L) > 0;
    }

    private bool TabloVarMi(NpgsqlConnection baglanti, string tablo)
    {
        using var komut = baglanti.CreateCommand();
        komut.CommandText = @"
            SELECT COUNT(*) FROM information_schema.tables
            WHERE table_schema='public' AND table_name=@tablo";
        komut.Parameters.AddWithValue("@tablo", tablo.ToLowerInvariant());
        return Convert.ToInt64(komut.ExecuteScalar() ?? 0L) > 0;
    }

    private void TablolusturEger()
    {
        using var baglanti = BaglantiAc();
        using var komut    = baglanti.CreateCommand();
        komut.CommandText  = VeritabaniSemasi.TabloOlusturmaSorgusu;
        komut.ExecuteNonQuery();
    }

    private void MigrasyonUygula()
    {
        using var baglanti = BaglantiAc();

        // Migrasyon 3: EgitimEtkinlikleri KurumId
        {
            if (!KolonVarMi(baglanti, "egitimetkinlikleri", "kurumid"))
            {
                using var mig = baglanti.CreateCommand();
                mig.CommandText = "ALTER TABLE EgitimEtkinlikleri ADD COLUMN IF NOT EXISTS KurumId INTEGER REFERENCES Kurumlar(Id) ON DELETE SET NULL";
                mig.ExecuteNonQuery();
            }
        }

        // Migrasyon 4: Kurumlar — Renk ve Logo kolonları
        {
            if (!KolonVarMi(baglanti, "kurumlar", "renk"))
            {
                using var mig = baglanti.CreateCommand();
                mig.CommandText = "ALTER TABLE Kurumlar ADD COLUMN IF NOT EXISTS Renk TEXT";
                mig.ExecuteNonQuery();
            }
            if (!KolonVarMi(baglanti, "kurumlar", "logo"))
            {
                using var mig = baglanti.CreateCommand();
                mig.CommandText = "ALTER TABLE Kurumlar ADD COLUMN IF NOT EXISTS Logo TEXT";
                mig.ExecuteNonQuery();
            }
        }

        // Migrasyon 5: BeklenenEgitimler — KurumId kolonu
        {
            if (!KolonVarMi(baglanti, "beklenenEgitimler", "kurumid"))
            {
                using var mig = baglanti.CreateCommand();
                mig.CommandText = "ALTER TABLE BeklenenEgitimler ADD COLUMN IF NOT EXISTS KurumId INTEGER REFERENCES Kurumlar(Id) ON DELETE SET NULL";
                mig.ExecuteNonQuery();
            }
        }

        // Migrasyon 6: BeklenenEgitimler — BeklenenGunSayisi kolonu
        {
            if (!KolonVarMi(baglanti, "beklenenEgitimler", "beklenegunsayisi"))
            {
                using var mig = baglanti.CreateCommand();
                mig.CommandText = "ALTER TABLE BeklenenEgitimler ADD COLUMN IF NOT EXISTS BeklenenGunSayisi INTEGER NOT NULL DEFAULT 1";
                mig.ExecuteNonQuery();
            }
        }

        // Migrasyon 2: EgitimEtkinlikleri yeni alanlar
        {
            if (!KolonVarMi(baglanti, "egitimetkinlikleri", "yer"))
            {
                using var mig = baglanti.CreateCommand();
                mig.CommandText = "ALTER TABLE EgitimEtkinlikleri ADD COLUMN IF NOT EXISTS Yer TEXT";
                mig.ExecuteNonQuery();
            }
            if (!KolonVarMi(baglanti, "egitimetkinlikleri", "etkinlikturu"))
            {
                using var mig = baglanti.CreateCommand();
                mig.CommandText = "ALTER TABLE EgitimEtkinlikleri ADD COLUMN IF NOT EXISTS EtkinlikTuru TEXT NOT NULL DEFAULT 'Egitim'";
                mig.ExecuteNonQuery();
            }
            if (!KolonVarMi(baglanti, "egitimetkinlikleri", "egitimtipi"))
            {
                using var mig = baglanti.CreateCommand();
                mig.CommandText = "ALTER TABLE EgitimEtkinlikleri ADD COLUMN IF NOT EXISTS EgitimTipi TEXT";
                mig.ExecuteNonQuery();
            }
            if (!KolonVarMi(baglanti, "egitimetkinlikleri", "masraf"))
            {
                using var mig = baglanti.CreateCommand();
                mig.CommandText = "ALTER TABLE EgitimEtkinlikleri ADD COLUMN IF NOT EXISTS Masraf NUMERIC(10,2)";
                mig.ExecuteNonQuery();
            }
        }

        // Migrasyon 1: Admin kullanıcısı seed
        {
            long kullaniciSayisi;
            using (var check = baglanti.CreateCommand())
            {
                check.CommandText = "SELECT COUNT(*) FROM Kullanicilar WHERE KullaniciAdi = 'admin'";
                kullaniciSayisi   = Convert.ToInt64(check.ExecuteScalar() ?? 0L);
            }
            if (kullaniciSayisi == 0)
            {
                var sifreHash = SifreHashle("Takvim2026!");
                using var mig = baglanti.CreateCommand();
                mig.CommandText = @"
                    INSERT INTO Kullanicilar (KullaniciAdi, Email, AdSoyad, SifreHash, Rol)
                    VALUES ('admin', 'admin@takvimapp.local', 'Admin', @hash, 'admin')
                    ON CONFLICT DO NOTHING";
                mig.Parameters.AddWithValue("@hash", sifreHash);
                mig.ExecuteNonQuery();
            }
        }
    }

    // ── Şifre hashleme (PBKDF2-SHA256) ───────────────────────────────────────
    // Format: base64(salt):base64(hash)
    public static string SifreHashle(string sifre)
    {
        var salt = RandomNumberGenerator.GetBytes(16);
        var hash = Rfc2898DeriveBytes.Pbkdf2(sifre, salt, 100_000, HashAlgorithmName.SHA256, 32);
        return Convert.ToBase64String(salt) + ":" + Convert.ToBase64String(hash);
    }

    public static bool SifreDogrula(string sifre, string sifreHash)
    {
        var parts = sifreHash.Split(':');
        if (parts.Length != 2) return false;
        var salt       = Convert.FromBase64String(parts[0]);
        var beklenen   = Convert.FromBase64String(parts[1]);
        var hesaplanan = Rfc2898DeriveBytes.Pbkdf2(sifre, salt, 100_000, HashAlgorithmName.SHA256, 32);
        return CryptographicOperations.FixedTimeEquals(beklenen, hesaplanan);
    }
}
