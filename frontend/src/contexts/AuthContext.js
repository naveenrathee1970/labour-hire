import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);
const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

function formatApiErrorDetail(detail) {
  if (detail == null) return "Something went wrong. Please try again.";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail))
    return detail.map((e) => (e && typeof e.msg === "string" ? e.msg : JSON.stringify(e))).filter(Boolean).join(" ");
  if (detail && typeof detail.msg === "string") return detail.msg;
  return String(detail);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('token'));

  const getHeaders = useCallback(() => {
    if (token) return { Authorization: `Bearer ${token}` };
    return {};
  }, [token]);

  const checkAuth = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API}/auth/me`, {
        withCredentials: true,
        headers: getHeaders()
      });
      setUser(data);
    } catch {
      setUser(null);
      setToken(null);
      localStorage.removeItem('token');
    } finally {
      setLoading(false);
    }
  }, [getHeaders]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = async (email, password) => {
    try {
      const { data } = await axios.post(`${API}/auth/login`, { email, password }, { withCredentials: true });
      if (data.token) {
        localStorage.setItem('token', data.token);
        setToken(data.token);
      }
      setUser(data);
      return { success: true, data };
    } catch (e) {
      return { success: false, error: formatApiErrorDetail(e.response?.data?.detail) || e.message };
    }
  };

  const register = async (email, password, name, role, phone) => {
    try {
      const { data } = await axios.post(`${API}/auth/register`, { email, password, name, role, phone }, { withCredentials: true });
      if (data.token) {
        localStorage.setItem('token', data.token);
        setToken(data.token);
      }
      setUser(data);
      return { success: true, data };
    } catch (e) {
      return { success: false, error: formatApiErrorDetail(e.response?.data?.detail) || e.message };
    }
  };

  const logout = async () => {
    try {
      await axios.post(`${API}/auth/logout`, {}, { withCredentials: true, headers: getHeaders() });
    } catch { /* ignore */ }
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
  };

  const api = useCallback((method, url, data = null) => {
    const config = { withCredentials: true, headers: getHeaders() };
    if (method === 'get' || method === 'delete') return axios[method](`${API}${url}`, config);
    return axios[method](`${API}${url}`, data, config);
  }, [getHeaders]);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, api, token }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
