namespace EasyNote.DTOs
{
    public class FileDTO
    {
        public string NoteId { get; set; }
        public string ContentBlockId { get; set; }
        public IFormFile File { get; set; }
    }
}
