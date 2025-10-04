import { Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import Home from "@/pages/Home";

const DefaultRoute = () => {
  const [startPage, setStartPage] = useState<string>('/');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const savedStartPage = localStorage.getItem('startPage') || '/';
    setStartPage(savedStartPage);
    setIsLoading(false);
  }, []);

  if (isLoading) {
    return null;
  }

  if (startPage !== '/') {
    return <Navigate to={startPage} replace />;
  }

  return <Home />;
};

export default DefaultRoute;
