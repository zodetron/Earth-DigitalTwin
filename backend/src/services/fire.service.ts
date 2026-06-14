import { query, queryOne } from '../config/db'

export const fireService = {
  getActiveHotspots: async (limit = 2000) => {
    return query(`
      SELECT
        fd.id, fd.latitude, fd.longitude, fd.brightness_ti4, fd.frp_mw,
        fd.confidence, fd.acq_date, fd.acq_time, fd.daynight, fd.fire_type,
        fd.cluster_id, fd.severity_score, fd.country_name,
        c.name AS city_name
      FROM fire_detections fd
      LEFT JOIN cities c ON c.id = fd.city_id
      ORDER BY fd.severity_score DESC
      LIMIT $1
    `, [limit])
  },

  getHotspotsByCity: async (cityId: string) => {
    return query(`
      SELECT * FROM fire_detections
      WHERE city_id = $1
      ORDER BY severity_score DESC
      LIMIT 100
    `, [cityId])
  },

  getCountryStats: async () => {
    return query(`
      SELECT
        country_name,
        COUNT(*)::int                              AS hotspot_count,
        ROUND(AVG(frp_mw)::numeric, 1)::float     AS avg_frp,
        ROUND(MAX(frp_mw)::numeric, 1)::float     AS max_frp,
        ROUND(AVG(severity_score)::numeric, 3)::float AS avg_severity,
        COUNT(DISTINCT cluster_id)::int            AS cluster_count,
        SUM(CASE WHEN severity_score >= 0.75 THEN 1 ELSE 0 END)::int AS critical_hotspots,
        SUM(CASE WHEN daynight = 'D' THEN 1 ELSE 0 END)::int AS day_detections,
        SUM(CASE WHEN daynight = 'N' THEN 1 ELSE 0 END)::int AS night_detections
      FROM fire_detections
      GROUP BY country_name
      ORDER BY hotspot_count DESC
    `)
  },

  getClusters: async (limit = 50) => {
    return query(`
      SELECT
        cluster_id,
        country_name,
        COUNT(*)::int                              AS hotspot_count,
        ROUND(AVG(latitude)::numeric, 5)::float   AS center_lat,
        ROUND(AVG(longitude)::numeric, 5)::float  AS center_lng,
        ROUND(AVG(frp_mw)::numeric, 2)::float     AS avg_frp,
        ROUND(MAX(frp_mw)::numeric, 2)::float     AS max_frp,
        ROUND(MAX(brightness_ti4)::numeric, 1)::float AS max_brightness,
        ROUND(AVG(severity_score)::numeric, 4)::float AS avg_severity,
        ROUND(MAX(severity_score)::numeric, 4)::float AS max_severity
      FROM fire_detections
      WHERE cluster_id IS NOT NULL
      GROUP BY cluster_id, country_name
      ORDER BY avg_severity DESC
      LIMIT $1
    `, [limit])
  },

  getSeverityDistribution: async () => {
    return query(`
      SELECT
        severity_level,
        COUNT(*)::int AS count,
        ROUND(AVG(frp_mw)::numeric, 2)::float AS avg_frp
      FROM (
        SELECT frp_mw,
          CASE
            WHEN severity_score >= 0.75 THEN 'CRITICAL'
            WHEN severity_score >= 0.50 THEN 'HIGH'
            WHEN severity_score >= 0.25 THEN 'MODERATE'
            ELSE 'LOW'
          END AS severity_level
        FROM fire_detections
      ) sub
      GROUP BY severity_level
      ORDER BY
        CASE severity_level
          WHEN 'CRITICAL' THEN 1
          WHEN 'HIGH'     THEN 2
          WHEN 'MODERATE' THEN 3
          ELSE 4
        END
    `)
  },

  getFrpDistribution: async () => {
    return query(`
      SELECT
        width_bucket(frp_mw, 0, 500, 20) AS bucket,
        (width_bucket(frp_mw, 0, 500, 20) - 1) * 25 AS frp_min,
        width_bucket(frp_mw, 0, 500, 20) * 25 AS frp_max,
        COUNT(*)::int AS count
      FROM fire_detections
      WHERE frp_mw <= 500
      GROUP BY bucket
      ORDER BY bucket
    `)
  },

  getGlobalSummary: async () => {
    return queryOne<Record<string, string>>(`
      SELECT
        COUNT(*)::text                                AS total_hotspots,
        COUNT(DISTINCT country_name)::text            AS countries_affected,
        COUNT(DISTINCT cluster_id)::text              AS active_clusters,
        ROUND(AVG(frp_mw)::numeric, 1)::text         AS avg_frp,
        ROUND(MAX(frp_mw)::numeric, 1)::text         AS max_frp,
        SUM(CASE WHEN severity_score >= 0.75 THEN 1 ELSE 0 END)::text AS critical_hotspots,
        SUM(CASE WHEN severity_score >= 0.50 THEN 1 ELSE 0 END)::text AS high_or_critical,
        ROUND(AVG(severity_score)::numeric, 3)::text AS avg_severity
      FROM fire_detections
    `)
  },

  getGlobalAnalytics: async () => {
    const [summary, countryStats, clusters, severityDist] = await Promise.all([
      fireService.getGlobalSummary(),
      fireService.getCountryStats(),
      fireService.getClusters(30),
      fireService.getSeverityDistribution(),
    ])
    return { summary, countryStats, clusters, severityDist }
  },
}
