namespace EasyNote.DTOs
{
    public class RegisterDTO
    {
        public string Account { get; set; }

        public string VerificationCode { get; set; }

        public string Password { get; set; }

        public string ConfirmPassword { get; set; }

        public string Name { get; set; }
    }
}
