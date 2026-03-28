namespace TakvimApp.Domain.Entities;

public class Kurum
{
    public int     Id          { get; set; }
    public int     KullaniciId { get; set; }
    public string  Ad          { get; set; } = string.Empty;
    public string? Notlar      { get; set; }
}
