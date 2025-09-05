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
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState(null);
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
      setCustomers((prev) => [...prev, addedCustomer]);
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

  // Delete customer
  const handleDeleteClick = (customer) => {
    setCustomerToDelete(customer);
    setShowDeleteModal(true);
  };
  
  const handleConfirmDelete = async () => {
    if (!customerToDelete) return;
    try {
      await axios.delete(`${API_BASE_URI}/api/customers/${customerToDelete._id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCustomers((prev) => prev.filter(c => c._id !== customerToDelete._id));
      toast.success("Customer deleted successfully");
    } catch (err) {
      console.error("Error deleting customer:", err.response || err);
      toast.error("Failed to delete customer");
    } finally {
      setShowDeleteModal(false);
      setCustomerToDelete(null);
    }
  };
  
  const handleCancelDelete = () => {
    setShowDeleteModal(false);
    setCustomerToDelete(null);
  };

  // Filtered customers based on search
  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.contact && c.contact.includes(search))
  );

  // Compute paginated customers
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentCustomers = filteredCustomers.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <FaSpinner className="animate-spin text-purple-600 text-4xl" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-xl p-10 max-w-4xl mx-auto space-y-8">
      <ToastContainer />
      <h2 className="text-3xl font-bold text-gray-900 mb-6">Customers</h2>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex justify-center items-center z-50">
          <div className="bg-white p-8 rounded-lg shadow-xl max-w-sm">
            <h3 className="text-xl font-bold mb-4">Confirm Deletion</h3>
            <p>Are you sure you want to delete customer: <span className="font-semibold">{customerToDelete?.name}</span>?</p>
            <div className="flex justify-end mt-6 space-x-4">
              <button onClick={handleCancelDelete} className="px-4 py-2 rounded-lg bg-gray-200 text-gray-800 hover:bg-gray-300">
                Cancel
              </button>
              <button onClick={handleConfirmDelete} className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add New Customer Form */}
      <form onSubmit={handleAddCustomer} className="space-y-4 bg-gray-50 p-6 rounded-lg shadow-md">
        <h3 className="text-xl font-semibold mb-4 flex items-center gap-2"><FaUserPlus />Add New Customer</h3>
        <div className="flex flex-col">
          <label className="font-semibold text-gray-700">Customer Name</label>
          <input type="text" name="name" value={newCustomer.name} onChange={handleChange}
            placeholder="Enter customer name" className="border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-purple-500" />
        </div>
        <div className="flex flex-col">
          <label className="font-semibold text-gray-700">Contact Number</label>
          <input type="text" name="contact" value={newCustomer.contact} onChange={handleChange}
            placeholder="Enter contact number" className="border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-purple-500" />
        </div>
        <button type="submit" className="bg-purple-600 text-white px-6 py-3 rounded-lg font-semibold shadow hover:bg-purple-700 transition flex items-center gap-2"><FaPlus /> Add Customer</button>
      </form>

      {/* Search */}
      <div className="mt-4">
        <input type="text" placeholder="Search by name or contact" value={search} onChange={(e) => setSearch(e.target.value)}
          className="border border-gray-300 rounded-lg p-2 w-full focus:outline-none focus:ring-2 focus:ring-purple-500" />
      </div>

      {/* Existing Customers Table */}
      <div className="overflow-x-auto mt-6 max-h-[400px] overflow-y-auto">
        <h3 className="text-xl font-semibold mb-4">Existing Customers</h3>
        <table className="min-w-full border border-gray-200 rounded-lg overflow-hidden">
          <thead className="bg-gray-100 sticky top-0">
            <tr>
              <th className="py-2 px-4 border-b text-left">Sr No</th>
              <th className="py-2 px-4 border-b text-left">Customer Name</th>
              <th className="py-2 px-4 border-b text-left">Contact</th>
              <th className="py-2 px-4 border-b text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {currentCustomers.length > 0 ? (
              currentCustomers.map((customer, i) => (
                <tr key={customer._id || i} className="hover:bg-gray-50">
                  <td className="py-2 px-4 border-b">{(currentPage - 1) * itemsPerPage + i + 1}</td>
                  <td className="py-2 px-4 border-b">
                    {editingCustomerId === customer._id ? (
                      <input type="text" name="name" value={editForm.name} onChange={handleEditChange}
                        className="border border-gray-300 rounded-lg p-1 w-full" />
                    ) : customer.name}
                  </td>
                  <td className="py-2 px-4 border-b">
                    {editingCustomerId === customer._id ? (
                      <input type="text" name="contact" value={editForm.contact} onChange={handleEditChange}
                        className="border border-gray-300 rounded-lg p-1 w-full" />
                    ) : customer.contact}
                  </td>
                  <td className="py-2 px-4 border-b space-y-2 sm:space-y-0 sm:space-x-2 flex flex-col sm:flex-row">
                    {editingCustomerId === customer._id ? (
                      <>
                        <button onClick={() => saveEdit(customer._id)} className="bg-green-500 text-white px-3 py-1 rounded w-full sm:w-auto flex items-center gap-1">
                          <FaSave /> Save
                        </button>
                        <button onClick={() => setEditingCustomerId(null)} className="bg-gray-300 px-3 py-1 rounded w-full sm:w-auto flex items-center gap-1">
                          <FaTimes /> Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => startEdit(customer)} className="bg-yellow-500 text-white px-3 py-1 rounded w-full sm:w-auto flex items-center gap-1">
                          <FaEdit /> Edit
                        </button>
                        <button onClick={() => handleDeleteClick(customer)} className="bg-red-500 text-white px-3 py-1 rounded w-full sm:w-auto flex items-center gap-1">
                          <FaTrashAlt /> Delete
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="4" className="py-4 text-center text-gray-500">No customers found</td>
              </tr>
            )}
          </tbody>
        </table>
        
        {/* Pagination Controls */}
        <div className="flex justify-between items-center mt-4">
          <button
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50"
          >
            Previous
          </button>

          <span>Page {currentPage} of {totalPages}</span>

          <button
            onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};

export default CustomerTab;
