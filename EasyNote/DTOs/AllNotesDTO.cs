using EasyNote.Models;

namespace EasyNote.DTOs
{
    public class AllNotesDTO
    {
        public string SelectedNoteId { get; set; }
        public List<Note?>? Notes { get; set; }
    }
}
