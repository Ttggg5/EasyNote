namespace EasyNote.DTOs
{
    public class CalendarEventDTO
    {
        public string EventId { get; set; }

        public string EventName { get; set; }

        public string EventContent { get; set; }

        public DateTime EventStartTime { get; set; }

        public DateTime EventEndTime { get; set; }
    }
}
