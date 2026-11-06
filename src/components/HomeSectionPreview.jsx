import {
  AtomIcon, ChartBarIcon, ChartDonutIcon, CloudIcon, CodeIcon,
  FlaskIcon, GlobeHemisphereWestIcon, LightningIcon, SparkleIcon,
  TerminalWindowIcon, UsersThreeIcon,
} from '@phosphor-icons/react';
import './HomeSectionPreview.css';

function WorkshopPreview() {
  return (
    <div className="home-preview-canvas home-preview-workshops">
      <div className="home-preview-orbit home-preview-orbit--one" />
      <div className="home-preview-orbit home-preview-orbit--two" />
      <div className="home-workshop-board">
        <div className="home-workshop-toolbar"><span /><span /><span /><TerminalWindowIcon weight="bold" /></div>
        <div className="home-workshop-code"><CodeIcon weight="bold" /><span>build something.</span></div>
        <div className="home-workshop-lines"><i /><i /><i /><i /></div>
        <div className="home-workshop-run"><LightningIcon weight="fill" /><span>Learn by doing</span><i /></div>
      </div>
      <div className="home-service-tile home-service-tile--lambda"><img src="/aws-service-icons/Arch_AWS-Lambda_48.svg" alt="" /><span>Lambda</span></div>
      <div className="home-service-tile home-service-tile--bedrock"><img src="/aws-service-icons/Arch_Amazon-Bedrock_48.svg" alt="" /><span>Bedrock</span></div>
      <div className="home-service-tile home-service-tile--storage"><img src="/aws-service-icons/Arch_Amazon-Simple-Storage-Service_48.svg" alt="" /><span>Amazon S3</span></div>
      <span className="home-preview-spark home-preview-spark--one"><SparkleIcon weight="fill" /></span>
      <span className="home-preview-caption">A little curiosity. A lot to build.</span>
    </div>
  );
}

function ScrapbookPreview() {
  return (
    <div className="home-preview-canvas home-preview-scrapbook">
      <div className="home-scrapbook-shadow" />
      <div className="home-scrapbook-book">
        <div className="home-scrapbook-cover" />
        <div className="home-scrapbook-page home-scrapbook-page--left">
          <span className="home-scrapbook-kicker">AWS COMMUNITY</span>
          <strong>Little moments.<br /><em>Big memories.</em></strong>
          <div className="home-scrapbook-photo"><img src="/scrapbook/kiro-world.webp" alt="" /><span>better together</span></div>
          <span className="home-scrapbook-tape" />
        </div>
        <div className="home-scrapbook-page home-scrapbook-page--right">
          <span className="home-scrapbook-date">A page of possibilities</span>
          <div className="home-scrapbook-note"><CloudIcon weight="duotone" /><span>Made of people.<br />Full of ideas.</span></div>
          <img className="home-scrapbook-sticker" src="/scrapbook/stickers/coding-duck.webp" alt="" />
          <span className="home-scrapbook-doodle"><SparkleIcon weight="fill" /></span>
          <span className="home-scrapbook-page-number">01</span>
        </div>
        <span className="home-scrapbook-spine" />
        <span className="home-scrapbook-ribbon" />
      </div>
      <span className="home-preview-caption">Your community, one page at a time.</span>
    </div>
  );
}

function InsightsPreview({ stats }) {
  const figures = stats.filter((stat) => typeof stat.count === 'number').slice(0, 2);
  return (
    <div className="home-preview-canvas home-preview-insights">
      <div className="home-preview-orbit home-preview-orbit--one" />
      <div className="home-insights-chart">
        <div className="home-insights-heading"><span><ChartBarIcon weight="duotone" />Community insights</span><i /></div>
        <div className="home-insights-bars">{[38, 57, 45, 72, 64, 91, 79].map((height, index) => <span key={index} style={{ '--bar-height': `${height}%`, '--bar-index': index }} />)}</div>
        <div className="home-insights-baseline"><span>People</span><span>Places</span><span>Connections</span></div>
      </div>
      <div className="home-insights-donut"><ChartDonutIcon weight="duotone" /><span>See the bigger picture</span></div>
      <div className="home-insights-people"><UsersThreeIcon weight="duotone" /><div>{figures[0] ? <><strong>{figures[0].count.toLocaleString()}</strong><span>{figures[0].label}</span></> : <><strong>Community</strong><span>People behind the numbers</span></>}</div></div>
      <div className="home-insights-world"><GlobeHemisphereWestIcon weight="duotone" />{figures[1] ? <span>{figures[1].count.toLocaleString()} {figures[1].label}</span> : <span>A worldwide view</span>}</div>
      <span className="home-preview-spark home-preview-spark--two"><SparkleIcon weight="fill" /></span>
      <span className="home-preview-caption">Discover the shape of your community.</span>
    </div>
  );
}

function ExperimentalPreview() {
  return (
    <div className="home-preview-canvas home-preview-experimental">
      <div className="home-experiment-orbit home-experiment-orbit--one"><span /></div>
      <div className="home-experiment-orbit home-experiment-orbit--two"><span /></div>
      <div className="home-experiment-plinth" />
      <div className="home-experiment-flask">
        <span className="home-experiment-halo" />
        <FlaskIcon weight="duotone" />
        <span className="home-experiment-bubble home-experiment-bubble--one" />
        <span className="home-experiment-bubble home-experiment-bubble--two" />
        <span className="home-experiment-bubble home-experiment-bubble--three" />
      </div>
      <div className="home-experiment-token home-experiment-token--atom"><AtomIcon weight="duotone" /></div>
      <div className="home-experiment-token home-experiment-token--code"><CodeIcon weight="bold" /></div>
      <div className="home-experiment-token home-experiment-token--bolt"><LightningIcon weight="fill" /></div>
      <span className="home-experiment-label"><SparkleIcon weight="fill" /> What if?</span>
      <span className="home-preview-caption">A playground for the next idea.</span>
    </div>
  );
}

export default function HomeSectionPreview({ section, compact = false, stats = [] }) {
  return (
    <div className={`home-section-preview${compact ? ' home-section-preview--compact' : ''}`} data-preview-section={section} aria-hidden="true">
      {section === 'workshops' && <WorkshopPreview />}
      {section === 'scrapbook' && <ScrapbookPreview />}
      {section === 'insights' && <InsightsPreview stats={stats} />}
      {section === 'experimental' && <ExperimentalPreview />}
    </div>
  );
}
