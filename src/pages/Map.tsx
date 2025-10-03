import { useEffect, useState } from "react";
import { MapPin, TrendingUp, Crown, Navigation } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { GoogleMap, LoadScript, Marker, InfoWindow, Polyline, HeatmapLayer } from "@react-google-maps/api";
import { Card } from "@/components/ui/card";
import { logLocationAccess } from "@/lib/locationSecurity";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { RadialBarChart, RadialBar, ResponsiveContainer } from "recharts";
import { useToast } from "@/hooks/use-toast";

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
  const [mapZoom, setMapZoom] = useState(13);
  const [isHeatmapMode, setIsHeatmapMode] = useState(false);
  const [currentExploreIndex, setCurrentExploreIndex] = useState(0);
  const [isExploring, setIsExploring] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [missingCoordinatesCount, setMissingCoordinatesCount] = useState(0);
  const [stats, setStats] = useState({
    topLocation: "--",
    rangeKm: 0,
  });
  const location = useLocation();
  const focusExpense = location.state?.focusExpense;
  const autoExplore = location.state?.autoExplore;
  const { toast } = useToast();

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

  // Auto-explore when navigated from home
  useEffect(() => {
    if (autoExplore && expenses.length > 0 && !isExploring) {
      const timer = setTimeout(() => {
        handleExploreLocations();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [autoExplore, expenses]);

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

      // Check for expenses with location_name but no coordinates
      const { data: missingData } = await supabase
        .from('expenses')
        .select('id')
        .eq('user_id', user.id)
        .not('location_name', 'is', null)
        .is('location_lat', null);
      
      setMissingCoordinatesCount(missingData?.length || 0);

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

  // Prepare heatmap data (will be generated inside LoadScript context)
  const getHeatmapData = () => {
    if (typeof google === 'undefined' || !google.maps) return [];
    return expenses
      .filter(e => e.location_lat && e.location_lng)
      .map(e => ({
        location: new google.maps.LatLng(e.location_lat!, e.location_lng!),
        weight: e.amount / 1000,
      }));
  };

  const mapContainerStyle = {
    width: '100%',
    height: 'calc(100vh - 300px)',
    borderRadius: '1rem',
  };

  // Handle heatmap mode toggle
  const handleHeatmapToggle = (checked: boolean) => {
    setIsHeatmapMode(checked);
    toast({
      title: checked ? "🔥 熱力圖模式" : "📍 標記模式",
      description: checked ? "顯示消費密度分布" : "顯示個別消費地點",
    });
  };

  // Explore locations function
  const handleExploreLocations = () => {
    console.log('探索地點按鈕被點擊', { expenses: expenses.length, isExploring });
    
    if (expenses.length === 0) {
      toast({
        title: "尚無可探索座標",
        description: "開始記帳後即可探索地點",
      });
      return;
    }

    if (isExploring) return;

    setIsExploring(true);
    const nextIndex = (currentExploreIndex + 1) % expenses.length;
    const expense = expenses[nextIndex];
    
    console.log('探索地點', { nextIndex, expense });
    
    if (expense.location_lat && expense.location_lng) {
      setMapCenter({ lat: expense.location_lat, lng: expense.location_lng });
      setMapZoom(16);
      setSelectedExpense(expense);
      setCurrentExploreIndex(nextIndex);
      
      toast({
        title: `📍 ${expense.location_name || "未知地點"}`,
        description: `第 ${nextIndex + 1} / ${expenses.length} 個地點 - $${expense.amount.toLocaleString()}`,
      });
    }

    setTimeout(() => setIsExploring(false), 1000);
  };

  // Geocode missing locations with smart Taiwan context
  const geocodeMissingExpenses = async () => {
    if (!GOOGLE_MAPS_API_KEY) {
      toast({
        title: "缺少 API Key",
        description: "請設定 Google Maps API Key",
        variant: "destructive",
      });
      return;
    }

    setIsGeocoding(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get expenses with location_name but no coordinates
      const { data: missingExpenses, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('user_id', user.id)
        .not('location_name', 'is', null)
        .is('location_lat', null);

      if (error) throw error;
      if (!missingExpenses || missingExpenses.length === 0) {
        toast({
          title: "✅ 無需補齊",
          description: "所有地點都已有座標",
        });
        setIsGeocoding(false);
        return;
      }

      // 常見簡稱對照表
      const locationAliases: Record<string, string> = {
        '北車': '台北車站',
        '西門': '西門町',
        '東區': '台北東區',
        '信義': '信義區',
        '天母': '天母商圈',
        '士林': '士林夜市',
        '師大': '師大夜市',
        '公館': '公館商圈',
        '中山': '中山區',
        '南港': '南港區',
        '內湖': '內湖區',
        '大安': '大安區',
        '松山': '松山區',
        '萬華': '萬華區',
        '中正': '中正區',
        '大直': '大直商圈',
        '天幕': '微風南山天幕劇院',
      };

      toast({
        title: "🔄 開始補齊座標",
        description: `正在處理 ${missingExpenses.length} 筆記錄...`,
      });

      let successCount = 0;
      let failCount = 0;
      const failedLocations: string[] = [];

      for (const expense of missingExpenses) {
        try {
          const originalName = expense.location_name;
          const expandedName = locationAliases[originalName] || originalName;
          
          // 多重搜尋策略
          const searchQueries = [
            `${expandedName}, 台灣`,
            `${expandedName}, 台北市, 台灣`,
            `${originalName}, Taiwan`,
          ];

          let geocodeSuccess = false;

          for (const query of searchQueries) {
            const response = await fetch(
              `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
                query
              )}&key=${GOOGLE_MAPS_API_KEY}&region=tw&language=zh-TW`
            );
            
            const data = await response.json();
            
            console.log(`🔍 搜尋 "${query}": ${data.status}`, data.results?.[0]?.formatted_address || 'N/A');
            
            if (data.status === 'OK' && data.results[0]) {
              const { lat, lng } = data.results[0].geometry.location;
              
              const { error: updateError } = await supabase
                .from('expenses')
                .update({
                  location_lat: lat,
                  location_lng: lng,
                })
                .eq('id', expense.id);

              if (updateError) {
                console.error(`❌ 更新失敗 (${originalName}):`, updateError);
              } else {
                successCount++;
                geocodeSuccess = true;
                console.log(`✅ 成功: ${originalName} -> ${data.results[0].formatted_address}`);
                break;
              }
            } else if (data.status === 'ZERO_RESULTS') {
              console.log(`⚠️ 無結果: "${query}"`);
              continue;
            } else if (data.status === 'REQUEST_DENIED') {
              console.error('🚫 API 金鑰錯誤或權限不足:', data.error_message);
              toast({
                title: "API 錯誤",
                description: "Google Maps API 金鑰未啟用 Geocoding API",
                variant: "destructive",
              });
              setIsGeocoding(false);
              return;
            } else {
              console.error(`❌ API 錯誤 (${query}):`, data.status, data.error_message);
              break;
            }

            await new Promise(resolve => setTimeout(resolve, 200));
          }

          if (!geocodeSuccess) {
            failCount++;
            failedLocations.push(originalName);
            console.log(`❌ 全部嘗試失敗: ${originalName}`);
          }

          await new Promise(resolve => setTimeout(resolve, 300));
        } catch (err) {
          console.error(`❌ 處理失敗 (${expense.location_name}):`, err);
          failCount++;
          failedLocations.push(expense.location_name);
        }
      }

      if (successCount > 0) {
        toast({
          title: "✅ 座標補齊完成",
          description: `成功補齊 ${successCount} 個地點！`,
        });
        fetchExpenses();
      }
      
      if (failCount > 0) {
        console.log('❌ 失敗的地點:', failedLocations);
        toast({
          title: "部分地點補齊失敗",
          description: `${failCount} 個地點: ${failedLocations.join('、')}。建議使用完整地址，例如「星巴克信義威秀門市」`,
          variant: "destructive",
          duration: 6000,
        });
      }
    } catch (error) {
      console.error('Error geocoding expenses:', error);
      toast({
        title: "補齊失敗",
        description: "無法補齊座標，請重試",
        variant: "destructive",
      });
    } finally {
      setIsGeocoding(false);
    }
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
        
        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-2">
            <Switch
              id="heatmap-mode"
              checked={isHeatmapMode}
              onCheckedChange={handleHeatmapToggle}
            />
            <Label htmlFor="heatmap-mode" className="text-sm cursor-pointer">
              🔥 熱力圖模式
            </Label>
          </div>
          
          <Button
            size="sm"
            variant="outline"
            onClick={handleExploreLocations}
            disabled={isExploring}
            className="gap-2"
          >
            <Navigation className="w-4 h-4" />
            探索地點
          </Button>
        </div>
      </motion.header>

      {/* Map */}
      <div className="p-6">
        {!GOOGLE_MAPS_API_KEY ? (
          <Card className="p-8 text-center">
            <p className="text-destructive text-lg font-semibold mb-2">⚠️ 缺少 Google Maps API Key</p>
            <p className="text-sm text-muted-foreground">
              請在 .env 文件中設定 VITE_GOOGLE_MAPS_API_KEY
            </p>
          </Card>
        ) : expenses.length > 0 ? (
          <LoadScript 
            googleMapsApiKey={GOOGLE_MAPS_API_KEY}
            libraries={["visualization"]}
            onLoad={() => console.log('Google Maps API 載入成功')}
            onError={(error) => console.error('Google Maps API 載入失敗:', error)}
          >
            <GoogleMap
              mapContainerStyle={mapContainerStyle}
              center={mapCenter}
              zoom={mapZoom}
              options={{
                styles: darkMapStyles,
                disableDefaultUI: false,
                zoomControl: true,
                mapTypeControl: false,
                streetViewControl: false,
                fullscreenControl: true,
              }}
            >
              {/* Heatmap Layer */}
              {isHeatmapMode && getHeatmapData().length > 0 && (
                <HeatmapLayer
                  data={getHeatmapData()}
                  options={{
                    radius: 30,
                    opacity: 0.7,
                    gradient: [
                      "rgba(0, 255, 255, 0)",
                      "rgba(0, 255, 255, 1)",
                      "rgba(0, 191, 255, 1)",
                      "rgba(0, 127, 255, 1)",
                      "rgba(0, 63, 255, 1)",
                      "rgba(0, 0, 255, 1)",
                      "rgba(0, 0, 223, 1)",
                      "rgba(0, 0, 191, 1)",
                      "rgba(0, 0, 159, 1)",
                      "rgba(0, 0, 127, 1)",
                      "rgba(63, 0, 91, 1)",
                      "rgba(127, 0, 63, 1)",
                      "rgba(191, 0, 31, 1)",
                      "rgba(255, 0, 0, 1)",
                    ],
                  }}
                />
              )}
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
                {!isHeatmapMode && typeof google !== 'undefined' && google.maps && expenses.map((expense, index) => {
                  if (!expense.location_lat || !expense.location_lng) return null;
                  
                  const isTopLocation = expense.location_name === stats.topLocation;
                  const scale = getMarkerScale(expense.amount);
                  
                  return (
                    <Marker
                      key={expense.id}
                      position={{ lat: expense.location_lat, lng: expense.location_lng }}
                      onClick={async () => {
                        setSelectedExpense(expense);
                        await logLocationAccess(expense.id, 'view');
                      }}
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

        {/* Geocode Missing Locations Button */}
        {missingCoordinatesCount > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4"
          >
            <Button
              onClick={geocodeMissingExpenses}
              disabled={isGeocoding}
              className="w-full gap-2"
              variant="secondary"
            >
              <MapPin className="w-4 h-4" />
              {isGeocoding ? "處理中..." : `一鍵補齊地點座標 (${missingCoordinatesCount} 筆)`}
            </Button>
          </motion.div>
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
