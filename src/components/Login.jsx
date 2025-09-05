import React, { useState } from "react";
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import axios from 'axios';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useNavigate } from 'react-router-dom';

// Define the base API URL
const API_BASE_URI = "https://game-book.onrender.com";

const Login = () => {
  const [role, setRole] = useState("admin");
  const [username, setUsername] = useState("");
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate(); 

  const handleSubmit = async (e) => {
    e.preventDefault();

    // 1. Pre-validation
    if (role === "admin" && !username.trim()) {
      toast.error("Please enter username");
      return;
    }
    if (role === "vendor" && !mobile.trim()) {
      toast.error("Please enter mobile number");
      return;
    }
    if (!password.trim()) {
      toast.error("Please enter password");
      return;
    }

    try {
      // Clear old session
      localStorage.clear();

      if (role === "admin") {
        // Admin login
        const { data } = await axios.post(`${API_BASE_URI}/api/auth/login`, {
          role: "admin",
          username,
          password,
        });

        localStorage.setItem("token", data.token);
        localStorage.setItem("role", "admin");

        toast.success("Login successful!");
        navigate("/admin", { replace: true });

      } else {
        // Vendor login
        const { data } = await axios.post(`${API_BASE_URI}/api/vendors/login`, {
          mobile,
          password,
        });

        // Block non-approved vendors
        if (data?.vendor?.status !== "approved") {
          toast.error(`Your account is ${data?.vendor?.status || "pending"}. Please contact admin.`);
          return;
        }

        localStorage.setItem("token", data.token);
        localStorage.setItem("role", "vendor");
        localStorage.setItem("vendorId", data.vendor.id);

        // Fetch vendor profile
        try {
          const profileRes = await axios.get(
            `${API_BASE_URI}/api/vendors/me`,
            {
              headers: { Authorization: `Bearer ${data.token}` },
            }
          );
          localStorage.setItem("vendorProfile", JSON.stringify(profileRes.data.vendor));
        } catch (err) {
          console.error("Failed to fetch vendor profile:", err.response?.data || err.message);
          toast.error("Could not fetch vendor profile. Please try again.");
        }

        toast.success("Login successful!");
        navigate("/vendor", { replace: true });
      }

    } catch (err) {
      console.error(err);
      // Role-specific wrong credential toast
      if (role === "admin") {
        toast.error("Incorrect username or password");
      } else {
        toast.error("Incorrect mobile number or password");
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-200 via-blue-100 to-white p-4">
      <div className="bg-white rounded-4xl shadow-2xl w-full max-w-3xl md:max-w-4xl flex flex-col md:flex-row overflow-hidden min-h-[500px] md:min-h-[600px]">
        
        {/* Left side */}
        <div className="hidden md:flex flex-1 bg-gradient-to-br from-purple-500 to-blue-500 relative items-center justify-center text-white p-12 flex-col gap-4">
          <div className="absolute inset-0 bg-black/20 rounded-l-4xl pointer-events-none"></div>
          <div className="mb-6">
            <div className="w-24 h-24 bg-white/30 rounded-full flex items-center justify-center">
              <span className="text-3xl">💼</span>
            </div>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold z-10">Welcome Back!</h2>
          <p className="text-base md:text-lg text-white/90 text-center z-10">
            Manage your business effortlessly. Login to continue.
          </p>
        </div>

        {/* Right side */}
        <div className="flex-1 p-10 md:p-16 flex flex-col justify-center gap-6">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-700 mb-6 text-center">Login</h2>

          {/* Role Selection */}
          <div className="flex flex-col sm:flex-row justify-center gap-4 sm:gap-6 mb-6">
            <label className="flex items-center gap-2 text-gray-600">
              <input type="radio" name="role" value="admin" checked={role==="admin"} onChange={()=>setRole("admin")} className="accent-blue-500"/>
              Admin
            </label>
            <label className="flex items-center gap-2 text-gray-600">
              <input type="radio" name="role" value="vendor" checked={role==="vendor"} onChange={()=>setRole("vendor")} className="accent-blue-500"/>
              Vendor
            </label>
          </div>

          {/* Form */}
          <form className="space-y-4 md:space-y-5" onSubmit={handleSubmit}>
            {role === "admin" ? (
              <input type="text" placeholder="Enter username" value={username} onChange={(e)=>setUsername(e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:shadow-md transition"/>
            ) : (
              <input type="text" placeholder="Enter mobile number" value={mobile} onChange={(e)=>setMobile(e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:shadow-md transition"/>
            )}

            <div className="relative">
              <input type={showPassword ? "text" : "password"} placeholder="Enter password" value={password} onChange={(e)=>setPassword(e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:shadow-md transition"/>
              <button type="button" onClick={()=>setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 p-0 m-0 !bg-transparent !border-none !rounded-none focus:outline-none">
                {showPassword ? <EyeSlashIcon className="h-5 w-5"/> : <EyeIcon className="h-5 w-5"/>}
              </button>
            </div>

            <button type="submit" className="w-full py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white font-semibold rounded-xl shadow-md hover:scale-105 transition-all">
              Login
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
