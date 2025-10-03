import { useEffect, useState } from "react";
import { MapPin, Navigation, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { GoogleMap, LoadScript, Marker, InfoWindow } from "@react-google-maps/api";
import { Card } from "@/components/ui/card";
import { format } from "date-fns";
import { useLocation } from "react-router-dom";

interface Expense {
  id: string;
  amount: number;
  category: string;
  description: string | null;
  location_name: string | null;
  location_lat: number | null;
  location_lng: number | null;
  expense_date: string;
}

const Map = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [mapCenter, setMapCenter] = useState({ lat: 25.0330, lng: 121.5654 }); // Taipei default
  const [stats, setStats] = useState({
    topLocation: "--",
    range: "--",
  });
  const location = useLocation();
  const focusExpense = location.state?.focusExpense;

  const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";

  useEffect(() => {
    fetchExpenses();
  }, []);

  useEffect(() => {
    if (focusExpense && focusExpense.location_lat && focusExpense.location_lng) {
      setMapCenter({
        lat: focusExpense.location_lat,
        lng: focusExpense.location_lng,
      });
      setSelectedExpense(focusExpense);
    }
  }, [focusExpense]);

  const fetchExpenses = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;

      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('user_id', user.id)
        .not('location_lat', 'is', null)
        .not('location_lng', 'is', null)
        .order('expense_date', { ascending: false });

      if (error) throw error;

      setExpenses(data || []);

      // Calculate stats
      if (data && data.length > 0) {
        // Most frequent location
        const locationCounts: { [key: string]: number } = {};
        data.forEach(exp => {
          if (exp.location_name) {
            locationCounts[exp.location_name] = (locationCounts[exp.location_name] || 0) + 1;
          }
        });
        const topLocation = Object.entries(locationCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "--";

        // Calculate range (max distance between any two points)
        let maxDistance = 0;
        for (let i = 0; i < data.length; i++) {
          for (let j = i + 1; j < data.length; j++) {
            if (data[i].location_lat && data[i].location_lng && data[j].location_lat && data[j].location_lng) {
              const distance = calculateDistance(
                data[i].location_lat!,
                data[i].location_lng!,
                data[j].location_lat!,
                data[j].location_lng!
              );
              maxDistance = Math.max(maxDistance, distance);
            }
          }
        }

        setStats({
          topLocation,
          range: maxDistance > 0 ? `${maxDistance.toFixed(1)} km` : "-- km",
        });

        // Set map center to the first expense
        if (data[0].location_lat && data[0].location_lng) {
          setMapCenter({
            lat: data[0].location_lat,
            lng: data[0].location_lng,
          });
        }
      }
    } catch (error) {
      console.error('Error fetching expenses:', error);
    }
  };

  // Calculate distance between two coordinates (Haversine formula)
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const getCategoryColor = (category: string): string => {
    switch (category) {
      case 'food': return '#ef4444'; // red
      case 'transport': return '#3b82f6'; // blue
      case 'entertainment': return '#a855f7'; // purple
      case 'shopping': return '#22c55e'; // green
      case 'daily': return '#f97316'; // orange
      default: return '#6b7280'; // gray
    }
  };

  const getCategoryEmoji = (category: string): string => {
    switch (category) {
      case 'food': return '🍽️';
      case 'transport': return '🚗';
      case 'entertainment': return '🎬';
      case 'shopping': return '🛍️';
      case 'daily': return '🏠';
      default: return '💰';
    }
  };

  const mapContainerStyle = {
    width: '100%',
    height: 'calc(100vh - 250px)',
    borderRadius: '1rem',
  };

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-10 px-6 py-4">
        <h1 className="text-2xl font-bold">消費地圖</h1>
        <p className="text-sm text-muted-foreground mt-1">
          探索你的消費足跡
        </p>
      </header>

      {/* Map */}
      <div className="p-6">
        {expenses.length > 0 ? (
          <LoadScript googleMapsApiKey={GOOGLE_MAPS_API_KEY}>
            <GoogleMap
              mapContainerStyle={mapContainerStyle}
              center={mapCenter}
              zoom={13}
              options={{
                styles: [
                  {
                    featureType: "poi",
                    elementType: "labels",
                    stylers: [{ visibility: "off" }]
                  }
                ]
              }}
            >
              {expenses.map((expense) => (
                expense.location_lat && expense.location_lng && (
                  <Marker
                    key={expense.id}
                    position={{ lat: expense.location_lat, lng: expense.location_lng }}
                    onClick={() => setSelectedExpense(expense)}
                    icon={{
                      path: google.maps.SymbolPath.CIRCLE,
                      fillColor: getCategoryColor(expense.category),
                      fillOpacity: 0.8,
                      strokeColor: '#ffffff',
                      strokeWeight: 2,
                      scale: 10,
                    }}
                  />
                )
              ))}

              {selectedExpense && selectedExpense.location_lat && selectedExpense.location_lng && (
                <InfoWindow
                  position={{ lat: selectedExpense.location_lat, lng: selectedExpense.location_lng }}
                  onCloseClick={() => setSelectedExpense(null)}
                >
                  <div className="p-2">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-2xl">{getCategoryEmoji(selectedExpense.category)}</span>
                      <div>
                        <p className="font-semibold">
                          {selectedExpense.description || selectedExpense.location_name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(selectedExpense.expense_date), 'yyyy/MM/dd HH:mm')}
                        </p>
                      </div>
                    </div>
                    <p className="text-lg font-bold" style={{ color: getCategoryColor(selectedExpense.category) }}>
                      ${selectedExpense.amount}
                    </p>
                    {selectedExpense.location_name && (
                      <p className="text-xs text-muted-foreground mt-1">
                        📍 {selectedExpense.location_name}
                      </p>
                    )}
                  </div>
                </InfoWindow>
              )}
            </GoogleMap>
          </LoadScript>
        ) : (
          <div className="bg-gradient-hero rounded-2xl shadow-medium overflow-hidden" style={{ height: 'calc(100vh - 250px)' }}>
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <MapPin className="w-16 h-16 mx-auto text-primary mb-4" />
                <p className="text-lg font-semibold">尚無消費地點</p>
                <p className="text-sm text-muted-foreground mt-2">
                  開始記帳後，你的消費地點會顯示在這裡
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="mt-6 grid grid-cols-2 gap-4">
          <Card className="p-4 shadow-soft hover-scale">
            <div className="flex items-center gap-2 mb-2">
              <Navigation className="w-4 h-4 text-primary" />
              <p className="text-sm text-muted-foreground">最常去的地點</p>
            </div>
            <p className="text-2xl font-bold">{stats.topLocation}</p>
          </Card>
          <Card className="p-4 shadow-soft hover-scale">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              <p className="text-sm text-muted-foreground">本月消費範圍</p>
            </div>
            <p className="text-2xl font-bold">{stats.range}</p>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Map;
