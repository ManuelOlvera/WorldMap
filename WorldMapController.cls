    public with sharing class WorldMapController {

    public Id currentMapId {get; private set;}

    public WorldMapController() {
        try{
            String mapName = ApexPages.currentPage().getParameters().get('name') != null ? ApexPages.currentPage().getParameters().get('name') : 'mytrips';
            currentMapId =  [SELECT Id FROM Map__c WHERE Name = :mapName].Id;
        }catch(Exception e){
            currentMapId =  null;
        }
    }

    @RemoteAction
    public static PlaceWrapper savePlace(PlaceWrapper place){
        try{
            Decimal lat = Decimal.valueOf(place.latitude);
            Decimal lon = Decimal.valueOf(place.longitude);
            if(placeExist(lat, lon, place.mapId) == null){
                Place__c p = new Place__c(Name = place.name, 
                    From__c = place.fromDate, To__c = place.toDate, Story__c = place.story, 
                    Coordinates__Latitude__s = lat,
                    Coordinates__Longitude__s = lon,
                    Map__c = place.mapId,
                    Country_Code__c = place.code);
                insert p;
                place.success = true; 
            } else {
                place.success = false; 
                place.errorMessage = 'This place already exist in your map';
            }
        }catch(Exception e){
            place.success = false;
            place.errorMessage = 'Something went wrong';
        }
        return place;
    }

    @RemoteAction
    public static List<PlaceWrapper> getVisitedPlaces(Id mapId){
        List<PlaceWrapper> placeList = new List<PlaceWrapper>();
        for(Place__c p : [SELECT Id, Name, Coordinates__latitude__s, Coordinates__longitude__s , From__c, Story__c, To__c, Country_Code__c
                                        FROM Place__c
                                        WHERE Map__c = :mapId]){
            placeList.add(new PlaceWrapper(p));
        }
        return placeList;
    }

    public void deleteAllPlaces() {
        List<Place__c> placeList = [SELECT Id FROM Place__c];
        delete placeList;
    }

    private static Place__c placeExist(Decimal lat, Decimal lon, Id mapId){
        try {
            return [SELECT Id, Name, Coordinates__latitude__s, Coordinates__longitude__s , From__c, Story__c, To__c, Country_Code__c
                        FROM Place__c
                        WHERE Coordinates__latitude__s = :lat
                        AND  Coordinates__longitude__s = :lon
                        AND Map__c = :mapId
                        LIMIT 1];			
        }catch(Exception e){
            return null;
        }
    }

    class PlaceWrapper {
        String name;
        String story;
        Date fromDate;
        Date toDate;
        String latitude;
        String longitude;
        Id mapId;
        Boolean success;
        String errorMessage;
        String code;

        public PlaceWrapper(Place__c p){            
            name = p.Name;
            story = p.Story__c;
            fromDate = p.From__c;
            toDate = p.To__c;
            latitude = String.valueOf(p.Coordinates__latitude__s);
            longitude = String.valueOf(p.Coordinates__longitude__s);	
            code = p.Country_Code__c;		
        }
    }
}
