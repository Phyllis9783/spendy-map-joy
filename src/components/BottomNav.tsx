import { Home, Map, User, Trophy } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";

const BottomNav = () => {
  const location = useLocation();

  const navItems = [
    { icon: Home, label: "首頁", path: "/" },
    { icon: Map, label: "地圖", path: "/map" },
    { icon: Trophy, label: "挑戰", path: "/my-challenges" },
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
                onClick={() => {
                  if (navigator.vibrate) {
                    navigator.vibrate(50);
                  }
                }}
                className="relative"
              >
                <motion.div
                  className={`
                    flex flex-col items-center gap-1 py-2 px-4 rounded-xl relative
                    transition-all duration-300
                    ${isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}
                  `}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute inset-0 bg-primary/10 rounded-xl"
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />
                  )}
                  <Icon className={`w-6 h-6 relative z-10 ${isActive ? 'animate-bounce-subtle' : ''}`} />
                  <span className={`text-xs font-medium relative z-10 ${isActive ? 'font-bold' : ''}`}>
                    {item.label}
                  </span>
                </motion.div>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
};

export default BottomNav;
