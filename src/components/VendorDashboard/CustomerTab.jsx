import React, { useState, useEffect, useCallback } from "react";
import { toast, ToastContainer } from "react-toastify";
import axios from "axios";
import {
  FaEdit,
  FaTrashAlt,
  FaSpinner,
  FaSave,
  FaTimes,
  FaUserPlus,
} from "react-icons/fa";

// API base URL
const API_BASE_URI = "https://game-book.onrender.com";

const CustomerTab = () => {
  // --- STATE MANAGEMENT ---
  const [customers, setCustomers] = useState([]);
  const [newCustomer, setNewCustomer] = useState({
    name: "",
    address: "",
  });
  const [search, setSearch] = useState("");
  const [editingCustomerId, setEditingCustomerId] = useState(null);
  const [editForm, setEditForm] = useState({
    name: "",
    address: "",
  });
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const token = localStorage.getItem("token");

  // --- API CALLS ---
  const fetchCustomers = useCallback(async () => {
    if (!token) {
      setLoading(false);
      toast.error("Authentication error. Please log in again.");
      return;
    }
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE_URI}/api/customers`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const customerData = res.data?.customers || res.data || [];
      if (!Array.isArray(customerData)) {
        console.error("Fetched data is not an array:", customerData);
        toast.error("Received an invalid format for customer data.");
        setCustomers([]);
        return;
      }
      const sortedCustomers = customerData.sort((a, b) => a.srNo - b.srNo);
      setCustomers(sortedCustomers);
    } catch (err) {
      console.error("Error fetching customers:", err);
      toast.error(err.response?.data?.message || "Failed to fetch customers.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  // --- EVENT HANDLERS ---
  const handleNewCustomerChange = (e) => {
    const { name, value } = e.target;
    setNewCustomer((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddCustomer = async (e) => {
    e.preventDefault();
    if (!newCustomer.name) {
      toast.warn("Customer Name is required.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await axios.post(
        `${API_BASE_URI}/api/customers`,
        newCustomer,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setCustomers((prevCustomers) => [...prevCustomers, res.data.customer]);
      setNewCustomer({ name: "", address: "" });
      toast.success("Customer added successfully!");
    } catch (err) {
      console.error("Error adding customer:", err);
      toast.error(err.response?.data?.message || "Failed to add customer.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const startEdit = (customer) => {
    setEditingCustomerId(customer._id);
    setEditForm({
      name: customer.name,
      address: customer.address || "",
    });
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
      const updatedCustomer = res.data.customer;
      setCustomers((prevCustomers) =>
        prevCustomers.map((customer) =>
          customer._id === id ? updatedCustomer : customer
        )
      );
      setEditingCustomerId(null);
      toast.success("Customer updated successfully!");
    } catch (err) {
      console.error("Error updating customer:", err);
      toast.error(err.response?.data?.message || "Failed to update customer.");
    }
  };

  const handleDeleteCustomer = async (customerToDelete) => {
    if (!customerToDelete) return;

    if (
      window.confirm(
        `Are you sure you want to delete ${customerToDelete.name}? This action cannot be undone.`
      )
    ) {
      try {
        await axios.delete(
          `${API_BASE_URI}/api/customers/${customerToDelete._id}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setCustomers((prev) =>
          prev.filter((c) => c._id !== customerToDelete._id)
        );
        toast.success("Customer deleted successfully.");
      } catch (err) {
        console.error("Error deleting customer:", err);
        toast.error(err.response?.data?.message || "Failed to delete customer.");
      }
    }
  };

  // --- DERIVED STATE ---
  const customersWithDisplaySrNo = customers.map((customer, index) => ({
    ...customer,
    displaySrNo: index + 1,
  }));

  const filteredCustomers = customersWithDisplaySrNo.filter((customer) => {
    const searchTerm = search.toLowerCase();
    return (
      customer.name.toLowerCase().includes(searchTerm) ||
      customer.displaySrNo.toString().includes(searchTerm)
    );
  });

  // --- RENDER LOGIC ---
  if (loading) {
    return (
      <div className="flex justify-center items-center h-full p-10">
        <FaSpinner className="animate-spin text-purple-600 text-4xl" />
        <p className="ml-3 text-lg text-gray-700">Loading Customers...</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen p-4 sm:p-6 lg:p-8">
      <ToastContainer position="top-right" autoClose={3000} />
      <div className="max-w-5xl mx-auto bg-white p-6 rounded-2xl shadow-lg">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">
          Customer Management
        </h1>

        {/* ADD CUSTOMER FORM */}
        <form
          onSubmit={handleAddCustomer}
          className="mb-8 p-4 border rounded-lg bg-gray-50"
        >
          <h2 className="text-lg font-semibold mb-3 text-gray-700 flex items-center gap-2">
            <FaUserPlus className="text-purple-600" /> Add New Customer
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Sr.No */}
            <div>
              <label className="font-semibold text-gray-600 block mb-1 text-sm">
                Sr.No
              </label>
              <input
                type="text"
                value={customers.length + 1}
                disabled
                className="border border-gray-300 rounded-lg p-2 w-full bg-gray-100 cursor-not-allowed"
              />
            </div>
            {/* Name */}
            <div>
              <label className="font-semibold text-gray-600 block mb-1 text-sm">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={newCustomer.name}
                onChange={handleNewCustomerChange}
                placeholder="e.g., John Doe"
                className="border border-gray-300 rounded-lg p-2 w-full focus:ring-1 focus:ring-purple-500 transition"
              />
            </div>
            {/* Address */}
            <div>
              <label className="font-semibold text-gray-600 block mb-1 text-sm">
                Address
              </label>
              <input
                type="text"
                name="address"
                value={newCustomer.address}
                onChange={handleNewCustomerChange}
                placeholder="e.g., 123 Main St"
                className="border border-gray-300 rounded-lg p-2 w-full focus:ring-1 focus:ring-purple-500 transition"
              />
            </div>
          </div>
          <div className="flex justify-center mt-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full sm:w-auto bg-green-600 text-white px-5 py-2 rounded-lg font-semibold shadow-md hover:bg-green-700 transition flex items-center justify-center gap-2 disabled:bg-green-400 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <FaSpinner className="animate-spin" /> Adding...
                </>
              ) : (
                "Add Customer"
              )}
            </button>
          </div>
        </form>

        {/* CUSTOMER LIST */}
        <h2 className="text-lg font-semibold mb-2 text-gray-700">
          Existing Customers ({filteredCustomers.length})
        </h2>
        <input
          type="text"
          placeholder="Search by Sr.No or Name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-gray-300 rounded-lg p-2 w-full mb-4 focus:ring-1 focus:ring-purple-500 transition"
        />

        <div className="overflow-x-auto border border-gray-200 rounded-lg">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-100">
              <tr>
                <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase">
                  Sr.No
                </th>
                <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase">
                  Name
                </th>
                <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase">
                  Address
                </th>
                <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredCustomers.length > 0 ? (
                filteredCustomers.map((customer) => (
                  <tr
                    key={customer._id}
                    className="hover:bg-gray-50 transition"
                  >
                    <td className="py-4 px-4 font-bold text-gray-800">
                      {customer.displaySrNo}
                    </td>
                    <td className="py-4 px-4">
                      {editingCustomerId === customer._id ? (
                        <input
                          type="text"
                          name="name"
                          value={editForm.name}
                          onChange={handleEditChange}
                          className="border border-gray-300 rounded-lg p-1 w-full"
                        />
                      ) : (
                        customer.name
                      )}
                    </td>
                    <td className="py-4 px-4">
                      {editingCustomerId === customer._id ? (
                        <input
                          type="text"
                          name="address"
                          value={editForm.address}
                          onChange={handleEditChange}
                          className="border border-gray-300 rounded-lg p-1 w-full"
                        />
                      ) : (
                        customer.address
                      )}
                    </td>
                    <td className="py-4 px-4">
                      {editingCustomerId === customer._id ? (
                        <div className="flex gap-2">
                          <button
                            onClick={() => saveEdit(customer._id)}
                            className="bg-green-500 text-white px-3 py-1 rounded-md flex items-center gap-1 hover:bg-green-600 transition"
                          >
                            <FaSave /> Save
                          </button>
                          <button
                            onClick={() => setEditingCustomerId(null)}
                            className="bg-gray-500 text-white px-3 py-1 rounded-md flex items-center gap-1 hover:bg-gray-600 transition"
                          >
                            <FaTimes /> Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <button
                            onClick={() => startEdit(customer)}
                            className="text-blue-600 hover:text-blue-800 transition"
                          >
                            <FaEdit />
                          </button>
                          <button
                            onClick={() => handleDeleteCustomer(customer)}
                            className="text-red-600 hover:text-red-800 transition"
                          >
                            <FaTrashAlt />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan="4"
                    className="text-center py-10 text-gray-500"
                  >
                    No customers found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default CustomerTab;