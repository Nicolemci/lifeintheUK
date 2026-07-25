export type TestCentre = {
  city: string;
  venue: string;
  address: string;
  latitude: number;
  longitude: number;
};

export type NearbyTestCentre = TestCentre & {
  distanceMiles: number;
};

export const testCentres: TestCentre[] = [
  { city: "Aberdeen", venue: "PSI at Aberdeen College", address: "Gallowgate", latitude: 57.1497, longitude: -2.0943 },
  { city: "Belfast", venue: "People 1st Belfast", address: "Ormeau House", latitude: 54.5973, longitude: -5.9301 },
  { city: "Birmingham", venue: "PSI Birmingham", address: "Gateway House, High Street", latitude: 52.4862, longitude: -1.8904 },
  { city: "Blackburn", venue: "Community Training Portal", address: "Kings Court, King Street", latitude: 53.7486, longitude: -2.4875 },
  { city: "Brighton", venue: "MTS at VP Brighton", address: "New England Road", latitude: 50.8225, longitude: -0.1372 },
  { city: "Bristol", venue: "PSI Bristol", address: "Creswicke House, Small Street", latitude: 51.4545, longitude: -2.5879 },
  { city: "Cardiff", venue: "PSI Cardiff at Bizspace", address: "Trafalgar House, Fitzalan Place", latitude: 51.4816, longitude: -3.1791 },
  { city: "Coventry", venue: "PSI Coventry", address: "Lockhurst Lane", latitude: 52.4068, longitude: -1.5197 },
  { city: "Croydon", venue: "PSI Croydon", address: "Grosvenor House, High Street", latitude: 51.3762, longitude: -0.0982 },
  { city: "Edinburgh", venue: "MTS Edinburgh", address: "Sciennes", latitude: 55.9533, longitude: -3.1883 },
  { city: "Exeter", venue: "PSI Exeter", address: "Brittany House, New North Street", latitude: 50.7184, longitude: -3.5339 },
  { city: "Glasgow", venue: "PSI Glasgow", address: "Adelphi Centre", latitude: 55.8642, longitude: -4.2518 },
  { city: "Hounslow", venue: "Computer Learning Centre", address: "Kingsley Road", latitude: 51.4684, longitude: -0.3609 },
  { city: "Ilford", venue: "PSI Ilford", address: "Caxton Place", latitude: 51.559, longitude: 0.0741 },
  { city: "Ipswich", venue: "PSI at The Hub Business Centre", address: "Civic Drive", latitude: 52.0567, longitude: 1.1482 },
  { city: "Leeds", venue: "PSI Leeds", address: "Oxford House, Oxford Row", latitude: 53.8008, longitude: -1.5491 },
  { city: "Leicester", venue: "PSI Leicester", address: "Charles Street", latitude: 52.6369, longitude: -1.1398 },
  { city: "Lewisham", venue: "PDA Training", address: "Lewisham High Street", latitude: 51.4415, longitude: -0.0117 },
  { city: "Liverpool", venue: "PSI Liverpool", address: "Union Court", latitude: 53.4084, longitude: -2.9916 },
  { city: "Luton", venue: "Community Training Portal", address: "Leagrave Road", latitude: 51.8787, longitude: -0.42 },
  { city: "Maidstone", venue: "Synod Solutions Ltd", address: "Kestrel House", latitude: 51.2704, longitude: 0.5227 },
  { city: "Manchester", venue: "PSI Manchester", address: "Boulton House, Chorlton Street", latitude: 53.4808, longitude: -2.2426 },
  { city: "Milton Keynes", venue: "MTS at Gloucester House", address: "Silbury Boulevard", latitude: 52.0406, longitude: -0.7594 },
  { city: "Newcastle", venue: "PSI Newcastle", address: "Arden House, Regent Centre", latitude: 54.9783, longitude: -1.6178 },
  { city: "Norwich", venue: "PSI at Sackville Place", address: "Magdalen Street", latitude: 52.6309, longitude: 1.2974 },
  { city: "Nottingham", venue: "CTP Nottingham", address: "Sherwood Rise", latitude: 52.9548, longitude: -1.1581 },
  { city: "Oxford", venue: "PSI Oxford", address: "Watlington House", latitude: 51.752, longitude: -1.2577 },
  { city: "Peterborough", venue: "PSI at Online Exams", address: "Sefton House", latitude: 52.5695, longitude: -0.2405 },
  { city: "Plymouth", venue: "PSI Plymouth", address: "Cobourg House, Mayflower Street", latitude: 50.3755, longitude: -4.1427 },
  { city: "Portsmouth", venue: "PSI Portsmouth", address: "Clarendon Road", latitude: 50.8198, longitude: -1.088 },
  { city: "Preston", venue: "Preston Test Centre", address: "Ormskirk Road", latitude: 53.7632, longitude: -2.7031 },
  { city: "Reading", venue: "PSI Reading", address: "Highline, Greyfriars Road", latitude: 51.4543, longitude: -0.9781 },
  { city: "Sheffield", venue: "PSI at Bank Street", address: "Synergy Building, Bank Street", latitude: 53.3811, longitude: -1.4701 },
  { city: "Stratford", venue: "PSI Stratford", address: "Boardman House, Broadway", latitude: 51.5413, longitude: -0.0038 },
  { city: "Swansea", venue: "PSI at Computeraid", address: "Wind Street", latitude: 51.6214, longitude: -3.9436 },
  { city: "Watford", venue: "CTP Watford", address: "Vicarage Road", latitude: 51.6565, longitude: -0.3903 },
  { city: "Workington", venue: "PSI at CPTT", address: "High Street", latitude: 54.6436, longitude: -3.5441 },
];

function distanceMiles(
  latitudeA: number,
  longitudeA: number,
  latitudeB: number,
  longitudeB: number,
): number {
  const earthRadiusMiles = 3958.8;
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const latitudeDelta = toRadians(latitudeB - latitudeA);
  const longitudeDelta = toRadians(longitudeB - longitudeA);
  const startLatitude = toRadians(latitudeA);
  const endLatitude = toRadians(latitudeB);
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(startLatitude) * Math.cos(endLatitude) * Math.sin(longitudeDelta / 2) ** 2;

  return 2 * earthRadiusMiles * Math.asin(Math.sqrt(haversine));
}

export function findClosestTestCentres(
  latitude: number,
  longitude: number,
  limit = 5,
): NearbyTestCentre[] {
  return testCentres
    .map((centre) => ({
      ...centre,
      distanceMiles: Math.round(distanceMiles(latitude, longitude, centre.latitude, centre.longitude) * 10) / 10,
    }))
    .sort((left, right) => left.distanceMiles - right.distanceMiles)
    .slice(0, limit);
}
