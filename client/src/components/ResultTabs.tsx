import React, { useEffect, useRef, useState } from 'react';
import { Col, Container, Nav, NavItem, NavLink, Row, TabContent, TabPane } from 'reactstrap';
import ResultTable from './ResultTable';
import { useAppSelector } from '../hooks';
import { translations } from '../utils/translations';
import ResultSQL from './ResultSQL';
import { withTabSwitcher } from '../hocs/withTabSwitcher';

type PreviewWorkflowProps = {
  previewRequestId: number;
  onReturnToEditor: () => void;
};

// Props that come from the HOC
type TabSwitcherProps = {
  activeTab: string;
  toggle: (tabId: string) => void;
};

// Combined props type
type ResultTabsProps = PreviewWorkflowProps & TabSwitcherProps;

export const ResultTabs: React.FC<ResultTabsProps> = ({
  activeTab,
  toggle,
  previewRequestId,
  onReturnToEditor,
}) => {
  const { language, result, query } = useAppSelector((state) => ({
    language: state.settings.language,
    result: state.query.result,
    query: state.query,
  }));

  const [isFloating, setIsFloating] = useState(false);
  const [hasPreviewRequest, setHasPreviewRequest] = useState(false);
  const resultsPanelRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef(toggle);
  toggleRef.current = toggle;
  const isCtePreview = Boolean(result?.isCtePreview);
  const resultTitle = isCtePreview
    ? `${translations[language.code].queryBuilder.ctePreviewResult} · ${result?.rowCount || 0} ${
        result?.rowCount === 1
          ? translations[language.code].queryBuilder.rowSingular
          : translations[language.code].queryBuilder.rowPlural
      }`
    : `${translations[language.code].queryBuilder.resultH}${result ? ` (${result.rowCount || 0})` : ''}`;

  useEffect(() => {
    if (previewRequestId === 0) {
      return;
    }
    setHasPreviewRequest(true);
    setIsFloating(false);
    toggleRef.current('2');
    const frameId = window.requestAnimationFrame(() => {
      resultsPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    return () => window.cancelAnimationFrame(frameId);
  }, [previewRequestId]);

  const handleTabSwitch = (tabId: string) => {
    if (tabId === '2') {
      setIsFloating(false);
    }
    toggle(tabId);
  };

  const handleFloatToggle = (floating: boolean) => {
    setIsFloating(floating);
  };

  return (
    <div ref={resultsPanelRef}>
      <Nav tabs>
        <NavItem>
          <NavLink
            className={`${activeTab === '1' ? 'active' : ''}`}
            onClick={() => {
              handleTabSwitch('1');
            }}
          >
            SQL
          </NavLink>
        </NavItem>
        <NavItem>
          <NavLink
            className={`${activeTab === '2' ? 'active' : ''} ${query.error ? 'text-danger' : ''}`}
            onClick={() => {
              handleTabSwitch('2');
            }}
          >
            {resultTitle}
          </NavLink>
        </NavItem>
      </Nav>
      <TabContent activeTab={activeTab}>
        <TabPane tabId="1">
          <Container fluid>
            <Row>
              <Col sm="12" className="p-1 h-auto">
                <ResultSQL isFloating={isFloating} onFloatToggle={handleFloatToggle} isActive={activeTab === '1'} />
              </Col>
            </Row>
          </Container>
        </TabPane>
        <TabPane tabId="2">
          <Container fluid>
            <Row>
              <Col sm="12" className="p-1">
                <ResultTable
                  showReturnToEditor={hasPreviewRequest}
                  onReturnToEditor={onReturnToEditor}
                />
              </Col>
            </Row>
          </Container>
        </TabPane>
      </TabContent>
    </div>
  );
};

export default withTabSwitcher(ResultTabs);
