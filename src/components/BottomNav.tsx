import { Home, Map, Users, User } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

const BottomNav = () => {
  const location = useLocation();

  const navItems = [
    { icon: Home, label: "首頁", path: "/" },
    { icon: Map, label: "地圖", path: "/map" },
    { icon: Users, label: "社群", path: "/community" },
    { icon: User, label: "我的", path: "/profile" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 glass-nav z-50 shadow-lg">
      <div className="max-w-4xl mx-auto px-6 py-3">
        <div className="flex justify-around items-center">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;

            return (
              <Link
                key={item.path}
                to={item.path}
                className={`
                  flex flex-col items-center gap-1 py-2 px-4 rounded-xl
                  transition-spring
                  ${isActive ? 'text-primary scale-110' : 'text-muted-foreground hover:text-foreground'}
                `}
              >
                <Icon className={`w-6 h-6 transition-spring ${isActive ? 'animate-float' : ''}`} />
                <span className="text-xs font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
};

export default BottomNav;
