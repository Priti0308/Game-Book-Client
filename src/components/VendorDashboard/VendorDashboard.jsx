import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaTachometerAlt,
  FaQuestionCircle,
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
  FaSpinner, // Import FaSpinner for the loading state
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
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [newCustomersToday, setNewCustomersToday] = useState(0);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true); // Add loading state

  // Sidebar toggle
  const toggleSidebar = () => setCollapsed(!collapsed);

  // Form data for editing profile
  // const [formData, setFormData] = useState({
  //   businessName: vendor?.businessName || "",
  //   name: vendor?.name || "",
  //   email: vendor?.email || "",
  //   mobile: vendor?.mobile || "",
  //   address: vendor?.address || "",
  // });


const [formData, setFormData] = useState({
  businessName: "",
  name: "",
  email: "",
  mobile: "",
  address: "",
});

  // Reports state
  const [reportType, setReportType] = useState("daily");
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [selectedMonth, setSelectedMonth] = useState(
    new Date().toISOString().slice(0, 7)
  );

  const [dailyIncome, setDailyIncome] = useState(0);
  const [monthlyIncome, setMonthlyIncome] = useState(0);

  const menu = [
    { key: "dashboard", label: "Dashboard", icon: <FaTachometerAlt /> },
    { key: "profile", label: "Profile", icon: <FaUserCircle /> },
    {
      key: "createReceipt",
      label: "Create Receipt",
      icon: <FaFileInvoiceDollar />,
    },
    { key: "viewReceipts", label: "View Receipts", icon: <FaClipboardList /> },
    { key: "customers", label: "Customers", icon: <FaUser /> },
    { key: "reports", label: "Reports", icon: <FaCoins /> },
    { key: "help", label: "Help", icon: <FaQuestionCircle /> },
    { key: "logout", label: "Logout", icon: <FaSignOutAlt /> },
  ];

  // --- SECURE LOGOUT ---
  const handleLogout = () => {
    // Remove only auth info
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("vendorProfile"); // Also clear profile cache

    // Force reload to login page, blocks back button access
    window.location.replace("/");
  };

  // ✅ CORRECTED useEffect TO FETCH VENDOR PROFILE
  useEffect(() => {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");

    // Redirect if not a logged-in vendor
    if (!token || role !== "vendor") {
      window.location.replace("/");
      return;
    }

    // --- THIS IS THE NEW PART ---
    // Create an async function to fetch the profile
    const fetchVendorProfile = async () => {
      try {
        // Make a GET request to your backend endpoint
        const response = await fetch(`${API_BASE_URI}/api/vendors/me`, {
          method: "GET",
          headers: {
            // IMPORTANT: Add the Authorization header
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          // If the server returns an error (like 401), handle it
          throw new Error("Failed to fetch profile. Please log in again.");
        }

        const data = await response.json();

        // Set the vendor state with the data from the API
        setVendor(data.vendor);

        // You can also save it to localStorage if you want to cache it
        localStorage.setItem("vendorProfile", JSON.stringify(data.vendor));
      } catch (error) {
        console.error("Error fetching vendor profile:", error);
        toast.error(error.message);
        // Optional: Log the user out if their token is invalid
        // handleLogout();
      } finally {
        // Set loading to false after the API call is complete
        setLoading(false);
      }
    };

    fetchVendorProfile(); // Call the function to start fetching data
  }, []); // The empty dependency array [] ensures this runs only once on mount

  // useEffect(() => {
  //   if (vendor) {
  //     setFormData({
  //       businessName: vendor.businessName || "",
  //       name: vendor.name || "",
  //       email: vendor.email || "",
  //       mobile: vendor.mobile || "",
  //       address: vendor.address || "",
  //     });
  //   }
  // }, [vendor]);

  // When user clicks "Edit"
  // VendorDashboard.js

const handleEditClick = () => {
  setFormData({
    businessName: vendor.businessName,
    name: vendor.name,
    email: vendor.email,
    mobile: vendor.mobile,
    address: vendor.address,
  });
  setEditMode(true);
};
  // Update form state on input change
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Save updated profile
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

      if (!res.ok) {
        console.error("Failed to save:", data);
        toast.error(data.message || "Failed to update profile");
        return;
      }

      toast.success("Profile updated successfully!");
      setVendor(data.vendor); // update local vendor state
      localStorage.setItem("vendorProfile", JSON.stringify(data.vendor)); // Update cache
      setEditMode(false);
    } catch (err) {
      console.error(" Error updating profile:", err);
      toast.error("Something went wrong");
    }
  };

  //report
  useEffect(() => {
    if (!selectedCustomer) return; // make sure a customer is selected

    const fetchReport = async () => {
      try {
        const token = localStorage.getItem("token");
        const customerId = selectedCustomer._id; // ✅ use actual ID

        // DAILY REPORT
        if (reportType === "daily") {
          const dailyRes = await fetch(
            `${API_BASE_URI}/api/reports/customer/${customerId}?period=daily&date=${selectedDate}`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          const dailyData = await dailyRes.json();
          setDailyIncome(dailyData.summary?.totalIncome || 0);
        }

        // MONTHLY REPORT
        if (reportType === "monthly") {
          const monthlyRes = await fetch(
            `${API_BASE_URI}/api/reports/customer/${customerId}?period=monthly&date=${selectedMonth}-01`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          const monthlyData = await monthlyRes.json();
          setMonthlyIncome(monthlyData.summary?.totalIncome || 0);
        }
      } catch (err) {
        console.error("Failed to fetch report", err);
      }
    };

    fetchReport();
  }, [reportType, selectedDate, selectedMonth, selectedCustomer]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
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

      {/* Main */}
      <div className="flex-1 p-6 overflow-y-auto">
        {currentSection === "dashboard" && (
          <div className="space-y-8">
            {/* Vendor Info */}
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
            {/* Quick Actions */}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 justify-items-center">
              <div
                onClick={() => setCurrentSection("createReceipt")}
                className="bg-purple-600 text-white rounded-xl p-6 text-center font-medium shadow-md hover:bg-purple-700 cursor-pointer transition max-w-xs w-full"
              >
                Create Receipt
              </div>

              <div
                onClick={() => setCurrentSection("viewReceipts")}
                className="bg-blue-600 text-white rounded-xl p-6 text-center font-medium shadow-md hover:bg-blue-700 cursor-pointer transition max-w-xs w-full"
              >
                View Receipts
              </div>

              <div
                onClick={() => setCurrentSection("reports")}
                className="bg-green-600 text-white rounded-xl p-6 text-center font-medium shadow-md hover:bg-green-700 cursor-pointer transition max-w-xs w-full"
              >
                Customer Reports
              </div>
            </div>

            {/* Recent Activities */}
            <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
              <h2 className="text-2xl font-semibold text-gray-800 mb-4 border-b pb-2">
                Recent Activities
              </h2>
              <div className="space-y-2 text-gray-600">
                {newCustomersToday > 0 ? (
                  <p>
                    New Customers Today:{" "}
                    <span className="font-semibold text-gray-800">
                      {newCustomersToday}
                    </span>
                  </p>
                ) : (
                  <p>No new customers today.</p>
                )}
                {/* Future: Map over additional recent activities array */}
              </div>
            </div>
          </div>
        )}

        {currentSection === "profile" && (
          <div className="bg-white rounded-2xl shadow-xl p-10 max-w-5xl mx-auto space-y-8">
            {/* Header */}
            <h2 className="text-4xl font-bold text-gray-900">
              Business Profile
            </h2>

            {editMode ? (
              // --- EDIT MODE ---
              <div className="space-y-6 text-gray-800 text-xl">
                {/* Business Name */}
                <div className="flex items-center gap-4">
                  <FaBuilding className="text-purple-600 text-2xl" />
                  <input
                    type="text"
                    name="businessName"
                    value={formData.businessName}
                    onChange={handleChange}
                    className="border rounded-lg p-2 w-full"
                  />
                </div>

                {/* Name */}
                <div className="flex items-center gap-4">
                  <FaUser className="text-purple-600 text-2xl" />
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className="border rounded-lg p-2 w-full"
                  />
                </div>

                {/* Email */}
                <div className="flex items-center gap-4">
                  <FaEnvelope className="text-purple-600 text-2xl" />
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="border rounded-lg p-2 w-full"
                  />
                </div>

                {/* Mobile */}
                <div className="flex items-center gap-4">
                  <FaPhone className="text-purple-600 text-2xl" />
                  <input
                    type="text"
                    name="mobile"
                    value={formData.mobile}
                    onChange={handleChange}
                    className="border rounded-lg p-2 w-full"
                  />
                </div>

                {/* Address */}
                <div className="flex items-center gap-4">
                  <FaMapMarkerAlt className="text-purple-600 text-2xl" />
                  <input
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    className="border rounded-lg p-2 w-full"
                  />
                </div>

                {/* Save / Cancel */}
                <div className="flex justify-end gap-4">
                  <button
                    onClick={() => setEditMode(false)}
                    className="px-6 py-3 bg-gray-300 rounded-lg font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    className="px-6 py-3 bg-purple-600 text-white rounded-lg font-semibold"
                  >
                    Save
                  </button>
                </div>
              </div>
            ) : (
              // --- VIEW MODE ---
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

                {/* Edit Button */}
                <div className="flex justify-end">
                  <button
                    onClick={handleEditClick}
                    className="flex items-center gap-2 bg-purple-600 text-white px-6 py-3 rounded-lg font-semibold shadow hover:bg-purple-700 transition"
                  >
                    <FaEdit /> Edit
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {currentSection === "customers" && (
          <CustomerTab
            onCustomerAdded={(customer) => {
              // normalize createdAt
              const normalizedCustomer = {
                ...customer,
                createdAt:
                  customer.createdAt?.$date ||
                  customer.createdAt ||
                  new Date().toISOString(),
              };

              // add to list
              setCustomers((prev) => {
                const updated = [...prev, normalizedCustomer];

                // update new customers count
                const today = new Date().toISOString().split("T")[0];
                const todayCount = updated.filter(
                  (c) => c.createdAt.substring(0, 10) === today
                ).length;
                setNewCustomersToday(todayCount);

                return updated;
              });
            }}
          />
        )}

        {currentSection === "createReceipt" && (
          <ReceiptForm businessName={vendor?.businessName} />
        )}

        {currentSection === "viewReceipts" && <ViewReceipts />}
        {currentSection === "reports" && <Report />}

        {currentSection === "help" && (
          <div className="space-y-6">
            {/* Header */}
            <div className="bg-white rounded-lg shadow p-6 text-center">
              <h1 className="text-3xl font-bold text-purple-600 mb-2">
                Varad Consultants & Analyst Pvt. Ltd
              </h1>
              <p className="text-gray-700 text-lg">
                How can we help you today?
              </p>
            </div>

            {/* Contact Info */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">
                Contact Us
              </h2>
              <div className="space-y-3 text-gray-700">
                <p>
                  <strong>Website:</strong>{" "}
                  <a
                    href="https://www.varadanalyst.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-purple-600 hover:underline"
                  >
                    www.varadanalyst.com
                  </a>
                </p>
                <p>
                  <strong>Phone:</strong>{" "}
                  <a
                    href="tel:+918446448461"
                    className="text-purple-600 hover:underline"
                  >
                    +91 8446448461
                  </a>
                </p>
                <p>
                  <strong>Address:</strong> 505, Shivcity Center, Vijaynagar,
                  Sangli 416416
                </p>
                <p>
                  <strong>Email:</strong>{" "}
                  <a
                    href="mailto:support@varadanalyst.com"
                    className="text-purple-600 hover:underline"
                  >
                    support@varadanalyst.com
                  </a>
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VendorDashboard;