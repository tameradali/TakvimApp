namespace TakvimApp.Domain.Entities;

public class Kullanici
{
    public int      Id                { get; set; }
    public string   KullaniciAdi      { get; set; } = string.Empty;
    public string   Email             { get; set; } = string.Empty;
    public string   AdSoyad           { get; set; } = string.Empty;
    public string   SifreHash         { get; set; } = string.Empty;
    public string   Rol               { get; set; } = "tenant"; // admin | tenant
    public DateTime OlusturulmaTarihi { get; set; }
}
