import { MapPin } from "lucide-react";

const Map = () => {
  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-10 px-6 py-4">
        <h1 className="text-2xl font-bold">消費地圖</h1>
        <p className="text-sm text-muted-foreground mt-1">
          探索你的消費足跡
        </p>
      </header>

      {/* Map Placeholder */}
      <div className="p-6">
        <div className="bg-gradient-hero rounded-2xl shadow-medium overflow-hidden" style={{ height: 'calc(100vh - 250px)' }}>
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <MapPin className="w-16 h-16 mx-auto text-primary mb-4" />
              <p className="text-lg font-semibold">地圖即將上線</p>
              <p className="text-sm text-muted-foreground mt-2">
                開始記帳後，你的消費地點會顯示在這裡
              </p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-6 grid grid-cols-2 gap-4">
          <div className="bg-card rounded-xl p-4 shadow-soft">
            <p className="text-sm text-muted-foreground">最常去的地點</p>
            <p className="text-2xl font-bold mt-2">--</p>
          </div>
          <div className="bg-card rounded-xl p-4 shadow-soft">
            <p className="text-sm text-muted-foreground">本月消費範圍</p>
            <p className="text-2xl font-bold mt-2">-- km</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Map;
