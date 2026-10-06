import { FigureDetail } from '../../components/FigureDetail';

/**
 * A Marketplace figure's page opened from a scan result. It slides in over the tabs, so Back
 * returns to the scan and the Marketplace tab is left as it was.
 */
export default function ScannedFigureScreen() {
  return <FigureDetail fullScreen />;
}
