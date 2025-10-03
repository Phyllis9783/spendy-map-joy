import { useEffect, useState } from "react";
import { MapPin, TrendingUp, Crown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { GoogleMap, LoadScript, Marker, InfoWindow, Polyline } from "@react-google-maps/api";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { RadialBarChart, RadialBar, ResponsiveContainer } from "recharts";

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
  const [mapCenter, setMapCenter] = useState({ lat: 25.0330, lng: 121.5654 });
  const [isHeatmapMode, setIsHeatmapMode] = useState(false);
  const [stats, setStats] = useState({
    topLocation: "--",
    rangeKm: 0,
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

      if (data && data.length > 0) {
        // Most frequent location
        const locationCounts: { [key: string]: number } = {};
        data.forEach(exp => {
          if (exp.location_name) {
            locationCounts[exp.location_name] = (locationCounts[exp.location_name] || 0) + 1;
          }
        });
        const topLocation = Object.entries(locationCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "--";

        // Calculate range
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
          rangeKm: maxDistance,
        });

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

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371;
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
      case 'food': return '#ef4444';
      case 'transport': return '#3b82f6';
      case 'entertainment': return '#a855f7';
      case 'shopping': return '#22c55e';
      case 'daily': return '#f97316';
      default: return '#6b7280';
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

  // Dark map styles
  const darkMapStyles = [
    { elementType: "geometry", stylers: [{ color: "#212121" }] },
    { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
    { elementType: "labels.text.fill", stylers: [{ color: "#757575" }] },
    { elementType: "labels.text.stroke", stylers: [{ color: "#212121" }] },
    { featureType: "administrative", elementType: "geometry", stylers: [{ color: "#757575" }] },
    { featureType: "administrative.country", elementType: "labels.text.fill", stylers: [{ color: "#9e9e9e" }] },
    { featureType: "administrative.land_parcel", stylers: [{ visibility: "off" }] },
    { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: "#bdbdbd" }] },
    { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#757575" }] },
    { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#181818" }] },
    { featureType: "poi.park", elementType: "labels.text.fill", stylers: [{ color: "#616161" }] },
    { featureType: "poi.park", elementType: "labels.text.stroke", stylers: [{ color: "#1b1b1b" }] },
    { featureType: "road", elementType: "geometry.fill", stylers: [{ color: "#2c2c2c" }] },
    { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#8a8a8a" }] },
    { featureType: "road.arterial", elementType: "geometry", stylers: [{ color: "#373737" }] },
    { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#3c3c3c" }] },
    { featureType: "road.highway.controlled_access", elementType: "geometry", stylers: [{ color: "#4e4e4e" }] },
    { featureType: "road.local", elementType: "labels.text.fill", stylers: [{ color: "#616161" }] },
    { featureType: "transit", elementType: "labels.text.fill", stylers: [{ color: "#757575" }] },
    { featureType: "water", elementType: "geometry", stylers: [{ color: "#000000" }] },
    { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#3d3d3d" }] },
  ];

  // Calculate marker size based on amount
  const getMarkerScale = (amount: number) => {
    if (expenses.length === 0) return 1;
    const maxAmount = Math.max(...expenses.map(e => e.amount));
    const minScale = 0.8;
    const maxScale = 1.6;
    return minScale + (amount / maxAmount) * (maxScale - minScale);
  };

  // Generate polyline path
  const polylinePath = expenses
    .filter(e => e.location_lat && e.location_lng)
    .sort((a, b) => new Date(a.expense_date).getTime() - new Date(b.expense_date).getTime())
    .map(e => ({ lat: e.location_lat!, lng: e.location_lng! }));

  // Prepare data for radial chart
  const rangePercentage = stats.rangeKm > 0 ? Math.min((stats.rangeKm / 50) * 100, 100) : 0;
  const radialChartData = [
    {
      name: "Range",
      value: rangePercentage,
      fill: "hsl(var(--primary))",
    },
  ];

  const mapContainerStyle = {
    width: '100%',
    height: 'calc(100vh - 300px)',
    borderRadius: '1rem',
  };

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <motion.header 
        className="bg-card border-b border-border sticky top-0 z-10 px-6 py-4"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
          消費地圖 🗺️
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          探索你的消費足跡，視覺化每筆花費
        </p>
        
        <div className="flex items-center gap-2 mt-3">
          <Switch
            id="heatmap-mode"
            checked={isHeatmapMode}
            onCheckedChange={setIsHeatmapMode}
          />
          <Label htmlFor="heatmap-mode" className="text-sm cursor-pointer">
            🔥 熱力圖模式
          </Label>
        </div>
      </motion.header>

      {/* Map */}
      <div className="p-6">
        {expenses.length > 0 ? (
          <LoadScript 
            googleMapsApiKey={GOOGLE_MAPS_API_KEY}
            libraries={isHeatmapMode ? ["visualization"] : []}
          >
            <GoogleMap
              mapContainerStyle={mapContainerStyle}
              center={mapCenter}
              zoom={13}
              options={{
                styles: darkMapStyles,
                disableDefaultUI: false,
                zoomControl: true,
                mapTypeControl: false,
                streetViewControl: false,
                fullscreenControl: true,
              }}
            >
              {/* Polyline connecting expense locations */}
              {!isHeatmapMode && polylinePath.length > 1 && (
                <Polyline
                  path={polylinePath}
                  options={{
                    strokeColor: getCategoryColor('entertainment'),
                    strokeOpacity: 0.5,
                    strokeWeight: 3,
                    geodesic: true,
                    icons: [
                      {
                        icon: {
                          path: "M 0,-1 0,1",
                          strokeOpacity: 1,
                          scale: 3,
                        },
                        offset: "0",
                        repeat: "20px",
                      },
                    ],
                  }}
                />
              )}

              {/* Animated markers */}
              <AnimatePresence>
                {!isHeatmapMode && expenses.map((expense, index) => {
                  if (!expense.location_lat || !expense.location_lng) return null;
                  
                  const isTopLocation = expense.location_name === stats.topLocation;
                  const scale = getMarkerScale(expense.amount);
                  
                  return (
                    <Marker
                      key={expense.id}
                      position={{ lat: expense.location_lat, lng: expense.location_lng }}
                      onClick={() => setSelectedExpense(expense)}
                      icon={{
                        path: google.maps.SymbolPath.CIRCLE,
                        fillColor: getCategoryColor(expense.category),
                        fillOpacity: isTopLocation ? 1 : 0.85,
                        strokeColor: isTopLocation ? "#FFD700" : "#ffffff",
                        strokeWeight: isTopLocation ? 4 : 2,
                        scale: (isTopLocation ? 14 : 10) * scale,
                      }}
                      animation={isTopLocation ? google.maps.Animation.BOUNCE : undefined}
                    />
                  );
                })}
              </AnimatePresence>

              {/* Info Window */}
              {selectedExpense && selectedExpense.location_lat && selectedExpense.location_lng && (
                <InfoWindow
                  position={{ lat: selectedExpense.location_lat, lng: selectedExpense.location_lng }}
                  onCloseClick={() => setSelectedExpense(null)}
                >
                  <div className="p-3 min-w-[220px]">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-4xl">{getCategoryEmoji(selectedExpense.category)}</span>
                      <div>
                        <p className="font-bold text-base">
                          {selectedExpense.description || selectedExpense.location_name}
                        </p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                          <MapPin className="w-3 h-3" />
                          {selectedExpense.location_name}
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t">
                      <p className="text-2xl font-bold" style={{ color: getCategoryColor(selectedExpense.category) }}>
                        ${selectedExpense.amount.toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(new Date(selectedExpense.expense_date), 'yyyy年MM月dd日 HH:mm')}
                      </p>
                    </div>
                  </div>
                </InfoWindow>
              )}
            </GoogleMap>
          </LoadScript>
        ) : (
          <div className="bg-gradient-hero rounded-2xl shadow-medium overflow-hidden" style={{ height: 'calc(100vh - 300px)' }}>
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

        {/* Stats Cards */}
        <div className="grid md:grid-cols-2 gap-6 mt-6">
          {/* Top Location Card */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Card className="p-6 glass-card border-2 border-primary/20 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-primary opacity-10 rounded-full blur-3xl"></div>
              <div className="flex items-start justify-between mb-4 relative z-10">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-full bg-gradient-primary shadow-glow">
                    <Crown className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">冠軍地點 🏆</p>
                    <p className="text-xl font-bold mt-1">{stats.topLocation}</p>
                  </div>
                </div>
              </div>
              <div className="mt-4 p-3 rounded-lg bg-primary/5 border border-primary/10">
                <p className="text-xs text-muted-foreground">
                  這是你最常造訪的消費地點
                </p>
              </div>
            </Card>
          </motion.div>

          {/* Range Card with Radial Chart */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <Card className="p-6 glass-card">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 rounded-full bg-secondary/10">
                  <TrendingUp className="w-6 h-6 text-secondary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">消費範圍</p>
                  <p className="text-2xl font-bold">{stats.rangeKm.toFixed(1)} km</p>
                </div>
              </div>
              
              <ResponsiveContainer width="100%" height={120}>
                <RadialBarChart
                  cx="50%"
                  cy="50%"
                  innerRadius="60%"
                  outerRadius="90%"
                  barSize={12}
                  data={radialChartData}
                  startAngle={90}
                  endAngle={-270}
                >
                  <RadialBar
                    background
                    dataKey="value"
                    cornerRadius={10}
                    fill="hsl(var(--primary))"
                  />
                </RadialBarChart>
              </ResponsiveContainer>
              
              <div className="mt-2 text-center">
                <p className="text-xs text-muted-foreground">
                  你的活動範圍涵蓋 {stats.rangeKm.toFixed(1)} 公里
                </p>
              </div>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Map;
