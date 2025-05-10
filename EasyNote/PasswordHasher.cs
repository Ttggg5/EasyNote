using System.Security.Cryptography;
using System.Text;

namespace EasyNote
{
    public static class PasswordHasher
    {
        public static string HashPassword(string password)
        {
            using (SHA256 sha256 = SHA256.Create())
            {
                // Convert the input string to bytes
                byte[] inputBytes = Encoding.UTF8.GetBytes(password);
                // Compute the hash
                byte[] hashBytes = sha256.ComputeHash(inputBytes);
                // Convert hash to hex string
                return Convert.ToHexString(hashBytes);
            }
        }

        public static bool VerifyPassword(string password, string storedHash)
        {
            string hashedInput = HashPassword(password);
            return string.Equals(hashedInput, storedHash, StringComparison.OrdinalIgnoreCase);
        }
    }
}
