import TopNav from "./TopNav";
import BottomNav from "./BottomNav";

const Layout = ({ children, title }) => (
  <div className="min-h-screen bg-[#F4F7F5] dark:bg-[#1a1a2e]">
    <TopNav title={title} />
    <main className="pb-20 md:pb-8 pt-16">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-6">{children}</div>
    </main>
    <BottomNav />
  </div>
);

export default Layout;
