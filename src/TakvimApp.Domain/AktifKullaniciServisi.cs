namespace TakvimApp.Domain;

public class AktifKullaniciServisi
{
    public int    KullaniciId { get; private set; } = 1;
    public string AdSoyad     { get; private set; } = "Yerel Kullanıcı";
    public string Email       { get; private set; } = "yerel@takvimapp.local";
    public string Rol         { get; private set; } = "tenant";

    public bool IsAdmin => Rol == "admin";

    public void Ayarla(int id, string adSoyad, string email, string rol = "tenant")
    {
        KullaniciId = id;
        AdSoyad     = adSoyad;
        Email       = email;
        Rol         = rol;
    }
}
