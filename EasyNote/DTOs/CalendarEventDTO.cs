namespace EasyNote.DTOs
{
    public class CalendarEventDTO
    {
        public string EventName { get; set; }

        public string EventContent { get; set; }

        public DateTime EventStartTime { get; set; }

        public DateTime EventEndTime { get; set; }
    }
}
