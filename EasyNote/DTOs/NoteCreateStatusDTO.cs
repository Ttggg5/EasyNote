namespace EasyNote.DTOs
{
    public class NoteCreateStatusDTO
    {
        public bool IsSuccessed {  get; set; }
        public string ErrorMsg { get; set; }
        public string NoteId { get; set; }
    }
}
