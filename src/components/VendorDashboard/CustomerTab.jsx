import React, { useState, useEffect } from "react";
import { toast, ToastContainer } from "react-toastify";
import axios from "axios";
import { FaEdit, FaTrashAlt, FaSpinner, FaPlus, FaSave, FaTimes, FaUserPlus } from "react-icons/fa";

// Define the base API URL
const API_BASE_URI = "https://game-book.onrender.com";

const CustomerTab = () => {
  const [customers, setCustomers] = useState([]);
  const [newCustomer, setNewCustomer] = useState({ name: "", contact: "" });
  const [search, setSearch] = useState("");
  const [editingCustomerId, setEditingCustomerId] = useState(null);
  const [editForm, setEditForm] = useState({ name: "", contact: "" });
  const [loading, setLoading] = useState(true);
  
  const token = localStorage.getItem("token");

  // Add state for pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  // Fetch customers on mount
  useEffect(() => {
    if (!token) return;

    const fetchCustomers = async () => {
      try {
        setLoading(true);
        const res = await axios.get(`${API_BASE_URI}/api/customers`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setCustomers(res.data.customers || []);
      } catch (err) {
        console.error("Error fetching customers:", err);
        toast.error("Failed to fetch customers.");
      } finally {
        setLoading(false);
      }
    };

    fetchCustomers();
  }, [token]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setNewCustomer((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddCustomer = async (e) => {
    e.preventDefault();
    if (!newCustomer.name || !newCustomer.contact) {
      toast.error("Please fill all required fields");
      return;
    }
    try {
      const res = await axios.post(
        `${API_BASE_URI}/api/customers`,
        newCustomer,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const addedCustomer = res.data.customer;
      if (!addedCustomer.createdAt) addedCustomer.createdAt = new Date().toISOString();
      setCustomers((prev) => [addedCustomer, ...prev]); // Add to the top of the list
      setNewCustomer({ name: "", contact: "" });
      toast.success("Customer added successfully!");
    } catch (err) {
      console.error("Error adding customer:", err);
      toast.error(err.response?.data?.message || "Failed to add customer");
    }
  };

  // Edit customer
  const startEdit = (customer) => {
    setEditingCustomerId(customer._id);
    setEditForm({ name: customer.name, contact: customer.contact });
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditForm((prev) => ({ ...prev, [name]: value }));
  };

  const saveEdit = async (id) => {
    try {
      const res = await axios.put(
        `${API_BASE_URI}/api/customers/${id}`,
        editForm,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setCustomers((prev) => prev.map(c => c._id === id ? res.data.customer : c));
      setEditingCustomerId(null);
      toast.success("Customer updated successfully");
    } catch (err) {
      console.error("Error updating customer:", err);
      toast.error("Failed to update customer");
    }
  };

  // Delete customer directly
  const handleDeleteCustomer = async (customerToDelete) => {
    if (!customerToDelete) return;
    try {
      await axios.delete(`${API_BASE_URI}/api/customers/${customerToDelete._id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCustomers((prev) => prev.filter(c => c._id !== customerToDelete._id));
      toast.success("Customer deleted successfully");
    } catch (err) {
      // --- ENHANCED ERROR LOGGING ---
      console.error("Detailed error deleting customer:", err); 
      if (err.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        console.error("Error data:", err.response.data);
        console.error("Error status:", err.response.status);
        const errorMessage = err.response.data?.message || 'Server error. Please check console.';
        toast.error(`Failed to delete: ${errorMessage}`);
      } else if (err.request) {
        // The request was made but no response was received
        console.error("Error request:", err.request);
        toast.error("Failed to delete: No response from server.");
      } else {
        // Something happened in setting up the request that triggered an Error
        console.error('Error message:', err.message);
        toast.error("Failed to delete: An unexpected error occurred.");
      }
    }
  };

  // Filtered customers based on search
  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.contact && c.contact.toString().includes(search))
  );

  // Compute paginated customers
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentCustomers = filteredCustomers.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full p-10">
        <FaSpinner className="animate-spin text-purple-600 text-4xl" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-xl p-4 sm:p-6 lg:p-10 w-full max-w-5xl mx-auto space-y-8">
      <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} />
      <h2 className="text-3xl font-bold text-gray-900 mb-6">Manage Customers</h2>

      {/* Add New Customer Form */}
      <form onSubmit={handleAddCustomer} className="space-y-4 bg-gray-50 p-4 sm:p-6 rounded-lg shadow-md">
        <h3 className="text-xl font-semibold mb-4 flex items-center gap-2"><FaUserPlus />Add New Customer</h3>
        <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
                <label className="font-semibold text-gray-700 block mb-1">Customer Name</label>
                <input type="text" name="name" value={newCustomer.name} onChange={handleChange}
                placeholder="Enter customer name" className="border border-gray-300 rounded-lg p-2 w-full focus:outline-none focus:ring-2 focus:ring-purple-500" />
            </div>
            <div className="flex-1">
                <label className="font-semibold text-gray-700 block mb-1">Contact Number</label>
                <input type="text" name="contact" value={newCustomer.contact} onChange={handleChange}
                placeholder="Enter contact number" className="border border-gray-300 rounded-lg p-2 w-full focus:outline-none focus:ring-2 focus:ring-purple-500" />
            </div>
        </div>
        <button type="submit" className="w-full sm:w-auto bg-purple-600 text-white px-6 py-3 rounded-lg font-semibold shadow hover:bg-purple-700 transition flex items-center justify-center gap-2">
            <FaPlus /> Add Customer
        </button>
      </form>

      {/* Search and Customer List */}
      <div className="space-y-4">
        <h3 className="text-xl font-semibold">Existing Customers</h3>
        <input type="text" placeholder="Search by name or contact..." value={search} onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
          className="border border-gray-300 rounded-lg p-2 w-full focus:outline-none focus:ring-2 focus:ring-purple-500" />
        
        {/* Responsive Table */}
        <div className="overflow-x-auto border border-gray-200 rounded-lg">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-100">
              <tr>
                <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sr No</th>
                <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer Name</th>
                <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {currentCustomers.length > 0 ? (
                currentCustomers.map((customer, i) => (
                  <tr key={customer._id || i} className="hover:bg-gray-50">
                    <td className="py-4 px-4 whitespace-nowrap text-sm text-gray-500">{(currentPage - 1) * itemsPerPage + i + 1}</td>
                    <td className="py-4 px-4 whitespace-nowrap text-sm text-gray-900">
                      {editingCustomerId === customer._id ? (
                        <input type="text" name="name" value={editForm.name} onChange={handleEditChange}
                          className="border border-gray-300 rounded-lg p-1 w-full" />
                      ) : customer.name}
                    </td>
                    <td className="py-4 px-4 whitespace-nowrap text-sm text-gray-900">
                      {editingCustomerId === customer._id ? (
                        <input type="text" name="contact" value={editForm.contact} onChange={handleEditChange}
                          className="border border-gray-300 rounded-lg p-1 w-full" />
                      ) : customer.contact}
                    </td>
                    <td className="py-4 px-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex flex-col sm:flex-row gap-2">
                        {editingCustomerId === customer._id ? (
                          <>
                            <button onClick={() => saveEdit(customer._id)} className="w-full sm:w-auto justify-center text-xs bg-green-500 text-white px-3 py-2 rounded-md flex items-center gap-1 hover:bg-green-600">
                              <FaSave /> Save
                            </button>
                            <button onClick={() => setEditingCustomerId(null)} className="w-full sm:w-auto justify-center text-xs bg-gray-500 text-white px-3 py-2 rounded-md flex items-center gap-1 hover:bg-gray-600">
                              <FaTimes /> Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => startEdit(customer)} className="w-full sm:w-auto justify-center text-xs bg-yellow-500 text-white px-3 py-2 rounded-md flex items-center gap-1 hover:bg-yellow-600">
                              <FaEdit /> Edit
                            </button>
                            <button onClick={() => handleDeleteCustomer(customer)} className="w-full sm:w-auto justify-center text-xs bg-red-500 text-white px-3 py-2 rounded-md flex items-center gap-1 hover:bg-red-600">
                              <FaTrashAlt /> Delete
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" className="py-4 text-center text-gray-500">No customers found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination Controls */}
        {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row justify-between items-center mt-4 gap-2">
            <span className="text-sm text-gray-700">Page {currentPage} of {totalPages}</span>
            <div className="inline-flex mt-2 sm:mt-0">
                <button
                    onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="px-4 py-2 text-sm font-medium text-gray-800 bg-gray-200 rounded-l hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Previous
                </button>
                <button
                    onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="px-4 py-2 text-sm font-medium text-gray-800 bg-gray-200 rounded-r border-0 border-l border-gray-300 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Next
                </button>
            </div>
            </div>
        )}
      </div>
    </div>
  );
};

export default CustomerTab;

