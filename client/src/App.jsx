import CursorTube from "@/components/CursorTube";
import DisclaimerGate from "@/components/DisclaimerGate";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
export default function App() {
    return (<ErrorBoundary>
      <ThemeProvider defaultTheme="light" switchable={true}>
        <CursorTube />
        <DisclaimerGate>
          <Switch>
            <Route path="/" component={Home}/>
            <Route component={NotFound}/>
          </Switch>
        </DisclaimerGate>
      </ThemeProvider>
    </ErrorBoundary>);
}
