import React, { useState, useEffect } from "react";
import {
  FaUsers,
  FaClock,
  FaCheckCircle,
  FaTimesCircle,
  FaUserPlus,
  FaUserClock,
  FaUserEdit,
  FaBars,
  FaTrash,
  FaCheck,
  FaTimes,
  FaDownload,
} from "react-icons/fa";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import axios from "axios";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useNavigate } from "react-router-dom";

// Define the base API URL
const API_BASE_URI = "https://game-book.onrender.com";

const AdminDashboard = () => {
  const navigate = useNavigate();

  // --- Authentication check ---
  useEffect(() => {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");

    if (!token || role !== "admin") {
      navigate("/", { replace: true });
    }
  }, [navigate]);

  const [collapsed, setCollapsed] = useState(false);
  const [currentSection, setCurrentSection] = useState("dashboard");
  const [vendors, setVendors] = useState([]);
  const [pendingVendors, setPendingVendors] = useState([]);
  const [approvedVendors, setApprovedVendors] = useState([]);
  const [rejectedVendors, setRejectedVendors] = useState([]);
  const [name, setName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [password, setPassword] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);

  // Modal states
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [editVendor, setEditVendor] = useState(null);
  const [newPassword, setNewPassword] = useState("");
  
  const toggleSidebar = () => setCollapsed(!collapsed);

  const menu = [
    { key: "dashboard", label: "Dashboard", icon: <FaBars /> },
    { key: "add", label: "Add Vendor", icon: <FaUserPlus /> },
    { key: "pending", label: "Pending Approvals", icon: <FaUserClock /> },
    { key: "manage", label: "Manage Profiles", icon: <FaUserEdit /> },
  ];

  useEffect(() => {
    fetchVendors();
  }, []);

  const fetchVendors = async () => {
    try {
      const res = await axios.get(`${API_BASE_URI}/api/vendors`);
      const all = res.data;
      setVendors(all);
      setPendingVendors(all.filter((v) => v.status === "pending"));
      setApprovedVendors(all.filter((v) => v.status === "approved"));
      setRejectedVendors(all.filter((v) => v.status === "rejected"));
    } catch (error) {
      console.error(error);
      toast.error("Failed to fetch vendors.");
    }
  };

  const handleAddVendor = async (e) => {
    e.preventDefault();
    if (!name || !businessName || !mobile || !email || !address || !password) {
      toast.error("Please fill all fields!");
      return;
    }
    try {
      setLoading(true);
      await axios.post(`${API_BASE_URI}/api/vendors`, {
        name,
        businessName,
        mobile,
        email,
        address,
        password,
      });
      toast.success("Vendor added successfully!");
      setName("");
      setBusinessName("");
      setEmail("");
      setMobile("");
      setAddress("");
      setPassword("");
      fetchVendors();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to add vendor.");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id) => {
    try {
      await axios.put(`${API_BASE_URI}/api/vendors/${id}`, {
        status: "approved",
      });
      toast.success("Vendor approved!");
      fetchVendors();
    } catch {
      toast.error("Failed to approve vendor.");
    }
  };

  const handleReject = async (id) => {
    try {
      await axios.put(`${API_BASE_URI}/api/vendors/${id}`, {
        status: "rejected",
      });
      toast.info("Vendor rejected.");
      fetchVendors();
    } catch {
      toast.error("Failed to reject vendor.");
    }
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`${API_BASE_URI}/api/vendors/${id}`);
      toast.warning("Vendor deleted.");
      fetchVendors();
    } catch {
      toast.error("Failed to delete vendor.");
    }
  };

  const handleEdit = (vendor) => {
    setEditVendor(vendor);
    setShowEditModal(true);
  };

  const saveEdit = async () => {
    if (
      !editVendor.name ||
      !editVendor.businessName ||
      !editVendor.mobile ||
      !editVendor.email ||
      !editVendor.address
    ) {
      toast.error("Please fill all fields!");
      return;
    }
    try {
      await axios.put(
        `${API_BASE_URI}/api/vendors/${editVendor._id}`,
        editVendor
      );
      toast.success("Vendor updated!");
      setShowEditModal(false);
      fetchVendors();
    } catch {
      toast.error("Failed to update vendor.");
    }
  };

  const handleChangePassword = (vendor) => {
    setEditVendor(vendor);
    setNewPassword("");
    setShowPasswordModal(true);
  };

  const savePassword = async () => {
    if (!newPassword) {
      toast.error("Please enter a new password!");
      return;
    }
    try {
      await axios.put(
        `${API_BASE_URI}/api/vendors/${editVendor._id}/password`,
        { password: newPassword }
      );
      toast.success("Password updated!");
      setShowPasswordModal(false);
    } catch {
      toast.error("Failed to update password.");
    }
  };

  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(vendors);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Vendors");
    XLSX.writeFile(wb, "vendors.xlsx");
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.text("Vendor List", 14, 10);
    autoTable(doc, {
      head: [["Name", "Business", "Mobile", "Email", "Address", "Status"]],
      body: vendors.map((v) => [
        v.name,
        v.businessName,
        v.mobile,
        v.email,
        v.address,
        v.status,
      ]),
    });
    doc.save("vendors.pdf");
  };

  const filteredVendors = vendors.filter((vendor) =>
    vendor.businessName.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const handleLogout = () => {
    const role = localStorage.getItem("role"); // get current role

    // Clear auth/session
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("vendorId");
    localStorage.removeItem("vendorProfile");

    // Redirect to correct login
    if (role === "admin") {
      navigate("/", { replace: true });
    } else if (role === "vendor") {
      navigate("/vendor-login", { replace: true });
    }
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-purple-500 to-pink-500 text-gray-800">
      <ToastContainer />
      {/* Sidebar */}
      <div
        className={`flex flex-col bg-white bg-opacity-90 shadow-lg transition-all duration-300 ${
          collapsed ? "w-20" : "w-64"
        }`}
      >
        <div className="flex items-center justify-between p-4 border-b">
          {!collapsed && <h2 className="font-bold text-purple-600">Admin</h2>}
          <button
            className="p-2 rounded hover:bg-gray-200"
            onClick={toggleSidebar}
          >
            <FaBars />
          </button>
        </div>
        <nav className="flex flex-col gap-2 p-2">
          {menu.map((item) => (
            
            <button
              key={item.key}
              onClick={() => setCurrentSection(item.key)}
              className={`flex items-center gap-3 p-2 rounded-lg font-medium transition ${
                currentSection === item.key
                  ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white"
                  : "hover:bg-gray-200"
              }`}
            >
              {item.icon}
              {!collapsed && <span>{item.label}</span>}
            </button>
            
          ))}
          
        </nav>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 p-2 mt-2 rounded-lg font-medium text-red-600 hover:bg-red-100 transition"
        >
          <FaTimesCircle />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>

      {/* Main */}
      <div className="flex-1 p-6 overflow-y-auto">
        {currentSection === "dashboard" && (
          <div>
            <h2 className="text-2xl font-bold text-white mb-6">
              Dashboard Overview
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white rounded-xl p-6 shadow-lg">
                <FaUsers className="text-purple-500 text-3xl mb-3" />
                <h4 className="font-semibold">Total Vendors</h4>
                <p className="text-2xl font-bold">{vendors.length}</p>
              </div>
              <div className="bg-white rounded-xl p-6 shadow-lg">
                <FaClock className="text-yellow-500 text-3xl mb-3" />
                <h4 className="font-semibold">Pending</h4>
                <p className="text-2xl font-bold">{pendingVendors.length}</p>
              </div>
              <div className="bg-white rounded-xl p-6 shadow-lg">
                <FaCheckCircle className="text-green-500 text-3xl mb-3" />
                <h4 className="font-semibold">Approved</h4>
                <p className="text-2xl font-bold">{approvedVendors.length}</p>
              </div>
              <div className="bg-white rounded-xl p-6 shadow-lg">
                <FaTimesCircle className="text-red-500 text-3xl mb-3" />
                <h4 className="font-semibold">Rejected</h4>
                <p className="text-2xl font-bold">{rejectedVendors.length}</p>
              </div>
            </div>
          </div>
        )}

        {currentSection === "add" && (
          <div className="bg-white rounded-xl p-6 shadow-lg">
            <h3 className="text-xl font-bold text-purple-600 mb-4">
              Add New Vendor
            </h3>
            <form
              className="grid grid-cols-1 md:grid-cols-2 gap-4"
              onSubmit={handleAddVendor}
            >
              <input
                className="border rounded p-2"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Name"
              />
              <input
                className="border rounded p-2"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="Business Name"
              />
              <input
                className="border rounded p-2"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                placeholder="Mobile"
              />
              <input
                className="border rounded p-2"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
              />
              <input
                className="border rounded p-2"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
              />
              <textarea
                className="border rounded p-2 md:col-span-2"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Address"
              />
              <button
                type="submit"
                className="bg-gradient-to-r from-purple-500 to-pink-500 text-white py-2 px-4 rounded-lg shadow hover:opacity-90"
                disabled={loading}
              >
                {loading ? "Adding..." : "Add Vendor"}
              </button>
            </form>
          </div>
        )}

        {currentSection === "pending" && (
          <div className="bg-white rounded-xl p-6 shadow-lg">
            <h3 className="text-xl font-bold text-purple-600 mb-4">
              Pending Approvals
            </h3>
            <table className="w-full border rounded">
              <thead className="bg-gradient-to-r from-purple-500 to-pink-500 text-white">
                <tr>
                  <th className="p-2">Name</th>
                  <th className="p-2">Business</th>
                  <th className="p-2">Mobile</th>
                  <th className="p-2">Email</th>
                  <th className="p-2">Address</th>
                  <th className="p-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pendingVendors.map((v) => (
                  <tr key={v._id} className="border-b">
                    <td className="p-2">{v.name}</td>
                    <td className="p-2">{v.businessName}</td>
                    <td className="p-2">{v.mobile}</td>
                    <td className="p-2">{v.email}</td>
                    <td className="p-2">{v.address}</td>
                    <td className="p-2 flex gap-2">
                      <button
                        className="bg-green-500 text-white p-2 rounded"
                        onClick={() => handleApprove(v._id)}
                      >
                        <FaCheck />
                      </button>
                      <button
                        className="bg-red-500 text-white p-2 rounded"
                        onClick={() => handleReject(v._id)}
                      >
                        <FaTimes />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {currentSection === "manage" && (
          <div className="bg-white rounded-xl p-6 shadow-lg">
            <h3 className="text-xl font-bold text-purple-600 mb-4">
              Manage Vendor Profiles
            </h3>
            <div className="flex justify-between mb-3">
              <input
                className="border rounded p-2 w-1/2"
                placeholder="Search vendor..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <div className="flex gap-2">
                <button
                  onClick={exportToExcel}
                  className="bg-blue-500 text-white px-3 py-2 rounded"
                >
                  <FaDownload /> Excel
                </button>
                <button
                  onClick={exportToPDF}
                  className="bg-red-500 text-white px-3 py-2 rounded"
                >
                  <FaDownload /> PDF
                </button>
              </div>
            </div>
            <table className="w-full border rounded">
              <thead className="bg-gradient-to-r from-purple-500 to-pink-500 text-white">
                <tr>
                  <th className="p-2">Name</th>
                  <th className="p-2">Business</th>
                  <th className="p-2">Mobile</th>
                  <th className="p-2">Address</th>
                  <th className="p-2">Email</th>
                  <th className="p-2">Status</th>
                  <th className="p-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredVendors.map((v) => (
                  <tr key={v._id} className="border-b">
                    <td className="p-2">{v.name}</td>
                    <td className="p-2">{v.businessName}</td>
                    <td className="p-2">{v.mobile}</td>
                    <td className="p-2">{v.address}</td>
                    <td className="p-2">{v.email}</td>
                    <td className="p-2">{v.status}</td>
                    <td className="p-2 flex gap-2">
                      <button
                        className="bg-indigo-500 text-white px-2 py-1 rounded"
                        onClick={() => handleEdit(v)}
                      >
                        Edit
                      </button>
                      <button
                        className="bg-yellow-500 text-white px-2 py-1 rounded"
                        onClick={() => handleChangePassword(v)}
                      >
                        Password
                      </button>
                      <button
                        className="bg-red-500 text-white px-2 py-1 rounded"
                        onClick={() => handleDelete(v._id)}
                      >
                        <FaTrash />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showEditModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          {/* Overlay */}
          <div
            className="fixed inset-0 bg-black bg-opacity-50"
            onClick={() => setShowEditModal(false)}
          ></div>

          {/* Modal content */}
          <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl shadow-xl text-white w-full max-w-lg relative z-10">
            {/* Header */}
            <div className="flex justify-between items-center p-4 border-b border-white/20">
              <h2 className="text-lg font-bold">Edit Vendor</h2>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-white text-xl font-bold hover:text-gray-200"
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div className="p-4">
              {editVendor && (
                <>
                  <input
                    type="text"
                    className="w-full px-3 py-2 mb-3 rounded-lg text-gray-900"
                    value={editVendor.name}
                    onChange={(e) =>
                      setEditVendor({ ...editVendor, name: e.target.value })
                    }
                    placeholder="Name"
                  />
                  <input
                    type="text"
                    className="w-full px-3 py-2 mb-3 rounded-lg text-gray-900"
                    value={editVendor.businessName}
                    onChange={(e) =>
                      setEditVendor({
                        ...editVendor,
                        businessName: e.target.value,
                      })
                    }
                    placeholder="Business Name"
                  />
                  <input
                    type="text"
                    className="w-full px-3 py-2 mb-3 rounded-lg text-gray-900"
                    value={editVendor.mobile}
                    onChange={(e) =>
                      setEditVendor({ ...editVendor, mobile: e.target.value })
                    }
                    placeholder="Mobile"
                  />
                  <input
                    type="text"
                    className="w-full px-3 py-2 mb-3 rounded-lg text-gray-900"
                    value={editVendor.email}
                    onChange={(e) =>
                      setEditVendor({ ...editVendor, email: e.target.value })
                    }
                    placeholder="Email"
                  />
                  <textarea
                    className="w-full px-3 py-2 mb-3 rounded-lg text-gray-900"
                    value={editVendor.address}
                    onChange={(e) =>
                      setEditVendor({ ...editVendor, address: e.target.value })
                    }
                    placeholder="Address"
                  ></textarea>
                </>
              )}
            </div>
            
            
            {/* Footer */}
            <div className="flex justify-end space-x-2 p-4 border-t border-white/20">
              <button
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition"
                onClick={() => setShowEditModal(false)}
              >
                Close
              </button>
              <button
                className="px-4 py-2 bg-white text-purple-600 font-semibold rounded-lg hover:bg-purple-100 transition"
                onClick={saveEdit}
              >
                Save Changes
              </button>
            </div>
            
          </div>
          
          
          
        </div>
        
        
      )}
      
      {showPasswordModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          {/* Overlay */}
          <div
            className="fixed inset-0 bg-black bg-opacity-50"
            onClick={() => setShowPasswordModal(false)}
          ></div>

          {/* Modal content */}
          <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl shadow-xl text-white w-full max-w-md relative z-10">
            {/* Header */}
            <div className="flex justify-between items-center p-4 border-b border-white/20">
              <h2 className="text-lg font-bold">Change Password</h2>
              <button
                onClick={() => setShowPasswordModal(false)}
                className="text-white text-xl font-bold hover:text-gray-200"
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div className="p-4">
              <input
                type="password"
                className="w-full px-3 py-2 mb-3 rounded-lg text-gray-900"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
              />
            </div>

            {/* Footer */}
            <div className="flex justify-end space-x-2 p-4 border-t border-white/20">
              <button
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition"
                onClick={() => setShowPasswordModal(false)}
              >
                Close
              </button>
              <button
                className="px-4 py-2 bg-white text-purple-600 font-semibold rounded-lg hover:bg-purple-100 transition"
                onClick={savePassword}
              >
                Save Password
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
