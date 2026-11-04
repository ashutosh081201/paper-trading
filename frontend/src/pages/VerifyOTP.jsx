import { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { verifyOTP } from "../services/api";
import { useTheme } from "../context/ThemeContext";
import { toast } from "react-toastify";

const VerifyOTP = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { darkMode } = useTheme();
  const email = location.state?.email || "";
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!otp) {
      toast.error("Please enter OTP");
      return;
    }

    if (otp.length !== 6) {
      toast.error("OTP must be 6 digits");
      return;
    }

    setLoading(true);
    try {
      const res = await verifyOTP({ email, otp });
      toast.success(res.data.message);
      navigate("/login");
    } catch (error) {
      toast.error(error.response?.data?.message || "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={`min-h-screen flex flex-col items-center justify-center px-4 py-8 ${
        darkMode ? "bg-gray-950" : "bg-gray-50"
      }`}
    >
      <div className="w-full max-w-md">
        {/* Header — Logo is clickable */}
        <div className="text-center mb-8">
          <Link
            to="/"
            className={`text-3xl font-bold hover:opacity-80 transition ${
              darkMode ? "text-white" : "text-gray-900"
            }`}
          >
            Stock<span className="text-green-400">Lab</span>
          </Link>
          <p className={`mt-2 ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
            Verify your email
          </p>
        </div>

        {/* Form */}
        <div
          className={`border rounded-2xl p-6 sm:p-8 ${
            darkMode
              ? "bg-gray-900 border-gray-800"
              : "bg-white border-gray-200 shadow-sm"
          }`}
        >
          <h2
            className={`text-xl font-bold mb-2 ${
              darkMode ? "text-white" : "text-gray-900"
            }`}
          >
            Enter OTP
          </h2>

          <p
            className={`text-sm mb-6 ${
              darkMode ? "text-gray-400" : "text-gray-500"
            }`}
          >
            OTP sent to{" "}
            <span className="text-green-400 font-medium">{email}</span>
            <br />
            Valid for 10 minutes
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                className={`block text-sm font-medium mb-1 ${
                  darkMode ? "text-gray-400" : "text-gray-600"
                }`}
              >
                6-Digit OTP
              </label>
              <input
                type="text"
                placeholder="Enter OTP"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                maxLength={6}
                className={`w-full border rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-green-400 transition tracking-widest text-center text-lg ${
                  darkMode
                    ? "bg-gray-800 border-gray-700 text-white"
                    : "bg-gray-50 border-gray-300 text-gray-900"
                }`}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-500 hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-lg transition"
            >
              {loading ? "Verifying..." : "Verify OTP"}
            </button>
          </form>

          <p
            className={`text-center text-sm mt-6 ${
              darkMode ? "text-gray-400" : "text-gray-500"
            }`}
          >
            Wrong email?{" "}
            <span
              onClick={() => navigate("/signup")}
              className="text-green-400 hover:text-green-300 font-medium cursor-pointer"
            >
              Go back to Signup
            </span>
          </p>
        </div>

        {/* Footer */}
        <p
          className={`text-center text-sm mt-6 ${
            darkMode ? "text-gray-300" : "text-gray-500"
          }`}
        >
          Made with <span className="text-red-400 text-base">❤️</span> by{" "}
          <span className="text-green-400 font-bold tracking-wide">
            Ashutosh
          </span>
        </p>
      </div>
    </div>
  );
};

export default VerifyOTP;
