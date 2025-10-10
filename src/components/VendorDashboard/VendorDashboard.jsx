import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaTachometerAlt,
  FaUserCircle,
  FaSignOutAlt,
  FaFileInvoiceDollar,
  FaClipboardList,
  FaBars,
  FaUser,
  FaEnvelope,
  FaPhone,
  FaMapMarkerAlt,
  FaBuilding,
  FaEdit,
  FaCoins,
  FaSpinner,
  FaReceipt,
  FaUserPlus,
} from "react-icons/fa";
import { toast } from "react-toastify";
import CustomerTab from "./CustomerTab";
import Report from "./Report";
import "react-toastify/dist/ReactToastify.css";
import ReceiptForm from "./ReceiptForm";
import ViewReceipts from "./ViewReceipts";

// Define the base API URL
const API_BASE_URI = "https://game-book.onrender.com";

const VendorDashboard = () => {
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentSection, setCurrentSection] = useState("dashboard");
  const [vendor, setVendor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [recentActivities, setRecentActivities] = useState([]);
  const [formData, setFormData] = useState({
    businessName: "",
    name: "",
    email: "",
    mobile: "",
    address: "",
  });

  const toggleSidebar = () => setCollapsed(!collapsed);

  // --- Menu updated to remove 'Help' ---
  const menu = [
    { key: "dashboard", label: "Dashboard", icon: <FaTachometerAlt /> },
    { key: "profile", label: "Profile", icon: <FaUserCircle /> },
    { key: "createReceipt", label: "Create Receipt", icon: <FaFileInvoiceDollar /> },
    { key: "viewReceipts", label: "View Receipts", icon: <FaClipboardList /> },
    { key: "customers", label: "Customers", icon: <FaUser /> },
    { key: "reports", label: "Reports", icon: <FaCoins /> },
    { key: "logout", label: "Logout", icon: <FaSignOutAlt /> },
  ];

  const handleLogout = () => {
    localStorage.clear(); // Clears all items for a cleaner logout
    window.location.replace("/");
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");

    if (!token || role !== "vendor") {
      window.location.replace("/");
      return;
    }

    const fetchVendorProfile = async () => {
      try {
        const response = await fetch(`${API_BASE_URI}/api/vendors/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) throw new Error("Failed to fetch profile.");
        const data = await response.json();
        setVendor(data.vendor);
        localStorage.setItem("vendorProfile", JSON.stringify(data.vendor));
      } catch (error) {
        toast.error(error.message);
      }
    };

    // --- Switched to REAL API CALL for activities ---
    const fetchRecentActivities = async () => {
      try {
        const response = await fetch(`${API_BASE_URI}/api/activities/recent`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) throw new Error("Failed to fetch activities.");
        const data = await response.json();
        // Use createdAt from the backend instead of a new Date()
        setRecentActivities(data.activities); 
      } catch (error) {
        console.error(error);
        toast.error("Could not load recent activities.");
      }
    };

    const loadDashboardData = async () => {
      setLoading(true);
      await Promise.all([
        fetchVendorProfile(),
        fetchRecentActivities()
      ]);
      setLoading(false);
    };

    loadDashboardData();
  }, []);

  const handleEditClick = () => {
    if (vendor) {
      setFormData({
        businessName: vendor.businessName,
        name: vendor.name,
        email: vendor.email,
        mobile: vendor.mobile,
        address: vendor.address,
      });
      setEditMode(true);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return toast.error("Not logged in!");

      const res = await fetch(`${API_BASE_URI}/api/vendors/me`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to update profile");
      
      toast.success("Profile updated successfully!");
      setVendor(data.vendor);
      localStorage.setItem("vendorProfile", JSON.stringify(data.vendor));
      setEditMode(false);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const getActivityIcon = (type) => {
    switch (type) {
      case "NEW_RECEIPT": return <FaReceipt className="text-blue-500" />;
      case "NEW_CUSTOMER": return <FaUserPlus className="text-green-500" />;
      default: return <FaClipboardList className="text-gray-500" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <FaSpinner className="animate-spin text-purple-600 text-6xl" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* Sidebar */}
      <div
        className={`flex flex-col bg-white shadow-lg transition-all ${
          collapsed ? "w-20" : "w-64"
        }`}
      >
        <div className="flex items-center justify-between p-4 border-b">
          {!collapsed && (
            <h2 className="font-bold text-purple-600">
              {vendor?.businessName || "Vendor"}
            </h2>
          )}
          <button
            onClick={toggleSidebar}
            className="p-2 rounded hover:bg-gray-200"
          >
            <FaBars />
          </button>
        </div>

        <nav className="flex flex-col gap-2 p-2">
          {menu.map((item) => (
            <button
              key={item.key}
              onClick={() => {
                if (item.key === "logout") handleLogout();
                else setCurrentSection(item.key);
              }}
              className={`flex items-center gap-3 p-2 rounded-lg font-medium transition ${
                currentSection === item.key
                  ? "bg-purple-500 text-white"
                  : "hover:bg-gray-200"
              }`}
            >
              {item.icon}
              {!collapsed && <span>{item.label}</span>}
            </button>
          ))}
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6 overflow-y-auto">
        {currentSection === "dashboard" && (
          <div className="space-y-8">
            <div className="bg-white rounded-2xl shadow-lg p-8 max-w-2xl mx-auto space-y-4">
              <h2 className="text-3xl font-bold text-purple-600 mb-4">
                Profile
              </h2>
              <div className="text-gray-800 text-lg font-semibold space-y-3">
                <p>
                  <span className="text-gray-400 font-normal">Name:</span>{" "}
                  {vendor?.name}
                </p>
                <p>
                  <span className="text-gray-400 font-normal">Email:</span>{" "}
                  {vendor?.email}
                </p>
                <p>
                  <span className="text-gray-400 font-normal">Mobile:</span>{" "}
                  {vendor?.mobile}
                </p>
                <p>
                  <span className="text-gray-400 font-normal">Address:</span>{" "}
                  {vendor?.address}
                </p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 justify-items-center">
              <div
                onClick={() => setCurrentSection("createReceipt")}
                className="bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl p-6 text-center font-semibold shadow-lg hover:scale-105 cursor-pointer transition-transform w-full max-w-xs"
              >
                Create Receipt
              </div>
              <div
                onClick={() => setCurrentSection("viewReceipts")}
                className="bg-gradient-to-r from-blue-500 to-cyan-400 text-white rounded-xl p-6 text-center font-semibold shadow-lg hover:scale-105 cursor-pointer transition-transform w-full max-w-xs"
              >
                View Receipts
              </div>
              <div
                onClick={() => setCurrentSection("reports")}
                className="bg-gradient-to-r from-green-500 to-teal-400 text-white rounded-xl p-6 text-center font-semibold shadow-lg hover:scale-105 cursor-pointer transition-transform w-full max-w-xs"
              >
                Customer Reports
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
              <h2 className="text-2xl font-semibold text-gray-800 mb-4 border-b pb-2">
                Recent Activities
              </h2>
              <div className="space-y-4 text-gray-600">
                {recentActivities.length > 0 ? (
                  recentActivities.map((activity) => (
                    <div key={activity._id} className="flex items-center gap-4">
                      <div className="text-2xl">
                        {getActivityIcon(activity.type)}
                      </div>
                      <div>
                        <p className="font-medium text-gray-800">{activity.description}</p>
                        <p className="text-sm text-gray-400">
                           {/* Use createdAt from the backend */}
                           {new Date(activity.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p>No recent activities to show.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {currentSection === "profile" && (
            <div className="bg-white rounded-2xl shadow-xl p-10 max-w-5xl mx-auto space-y-8">
            <h2 className="text-4xl font-bold text-gray-900">Business Profile</h2>
            {editMode ? (
              <div className="space-y-6 text-gray-800 text-xl">
                <div className="flex items-center gap-4">
                  <FaBuilding className="text-purple-600 text-2xl" />
                  <input type="text" name="businessName" value={formData.businessName} onChange={handleChange} className="border rounded-lg p-2 w-full" />
                </div>
                <div className="flex items-center gap-4">
                  <FaUser className="text-purple-600 text-2xl" />
                  <input type="text" name="name" value={formData.name} onChange={handleChange} className="border rounded-lg p-2 w-full" />
                </div>
                <div className="flex items-center gap-4">
                  <FaEnvelope className="text-purple-600 text-2xl" />
                  <input type="email" name="email" value={formData.email} onChange={handleChange} className="border rounded-lg p-2 w-full" />
                </div>
                <div className="flex items-center gap-4">
                  <FaPhone className="text-purple-600 text-2xl" />
                  <input type="text" name="mobile" value={formData.mobile} onChange={handleChange} className="border rounded-lg p-2 w-full" />
                </div>
                <div className="flex items-center gap-4">
                  <FaMapMarkerAlt className="text-purple-600 text-2xl" />
                  <input type="text" name="address" value={formData.address} onChange={handleChange} className="border rounded-lg p-2 w-full" />
                </div>
                <div className="flex justify-end gap-4">
                  <button onClick={() => setEditMode(false)} className="px-6 py-3 bg-gray-300 rounded-lg font-semibold">
                    Cancel
                  </button>
                  <button onClick={handleSave} className="px-6 py-3 bg-purple-600 text-white rounded-lg font-semibold">
                    Save
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-6 text-gray-800 text-xl">
                <div className="flex items-center gap-4">
                  <FaBuilding className="text-purple-600 text-2xl" />
                  <span className="font-semibold">{vendor?.businessName}</span>
                </div>
                <div className="flex items-center gap-4">
                  <FaUser className="text-purple-600 text-2xl" />
                  <span className="font-semibold">{vendor?.name}</span>
                </div>
                <div className="flex items-center gap-4">
                  <FaEnvelope className="text-purple-600 text-2xl" />
                  <span className="font-semibold">{vendor?.email}</span>
                </div>
                <div className="flex items-center gap-4">
                  <FaPhone className="text-purple-600 text-2xl" />
                  <span className="font-semibold">{vendor?.mobile}</span>
                </div>
                <div className="flex items-center gap-4">
                  <FaMapMarkerAlt className="text-purple-600 text-2xl" />
                  <span className="font-semibold">{vendor?.address}</span>
                </div>
                <div className="flex justify-end">
                  <button onClick={handleEditClick} className="flex items-center gap-2 bg-purple-600 text-white px-6 py-3 rounded-lg font-semibold shadow hover:bg-purple-700 transition">
                    <FaEdit /> Edit
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {currentSection === "customers" && <CustomerTab />}
        {currentSection === "createReceipt" && <ReceiptForm businessName={vendor?.businessName} />}
        {currentSection === "viewReceipts" && <ViewReceipts />}
        {currentSection === "reports" && <Report />}
      </div>
    </div>
  );
};

export default VendorDashboard;