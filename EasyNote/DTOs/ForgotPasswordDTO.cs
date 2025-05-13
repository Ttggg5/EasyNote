namespace EasyNote.DTOs
{
    public class ForgotPasswordDTO
    {
        public string Account { get; set; }

        public string VerificationCode { get; set; }

        public string Password { get; set; }

        public string ConfirmPassword { get; set; }
    }
}
