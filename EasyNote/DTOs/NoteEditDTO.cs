namespace EasyNote.DTOs
{
    public enum NoteEditTypes
    {
        Name,
        ContentAttribute,
        ContentObject,
        ContentText,
        AddContentBlock,
        DeleteContentBlock,
        ContentBlockOrder,
    }

    public enum ContentTextTypes
    {
        None,
        Heading1,
        Heading2,
        Heading3,
        Text,
        BulletList,
        OrderedList,
    }

    public enum ContentObjectTypes
    {
        None,
        Image,
        Youtube,
    }

    public class NoteEditDTO
    {
        public string UserId { get; set; }
        public string NoteId { get; set; }
        public string EditType { get; set; }
        public string NoteName { get; set; }
        public string ContentBlockId { get; set; }
        public string ContentTextType { get; set; }
        public string ContentObjectType { get; set; }
        public string Content { get; set; }
        public int ContentBlockOldIndex { get; set; }
        public int ContentBlockNewIndex { get; set; }
    }
}
