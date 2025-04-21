namespace EasyNote.DTOs
{
    public enum NoteEditType
    {
        Name,
        Content,
        AddContentBlock,
        DeleteContentBlock,
        ContentBlockOrder,
    }

    public class NoteEditDTO
    {
        public string UserId { get; set; }
        public string NoteId { get; set; }
        public string EditType { get; set; }
        public string NoteName { get; set; }
        public string ContentBlockId { get; set; }
        public string ContentBlockType { get; set; }
        public string Content { get; set; }
        public int ContentBlockOldIndex { get; set; }
        public int ContentBlockNewIndex { get; set; }
    }
}
