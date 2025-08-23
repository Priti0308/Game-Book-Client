import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { ToastContainer, Slide } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Login from "./components/Login";
import AdminDashboard from "./components/AdminDashboard/Admindashboard";
// import VendorDashboard from "./components/VendorDashboard"; // if you have one

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/admin" element={<AdminDashboard />} />
        {/* <Route path="/vendor" element={<VendorDashboard />} /> */}
      </Routes>

      <ToastContainer
        position="top-right"
        autoClose={2000}
        hideProgressBar={false}
        newestOnTop={true}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        transition={Slide}
      />
    </Router>
  );
}

export default App;
