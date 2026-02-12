package seeddata

// SeedVenue holds raw venue data for seeding.
type SeedVenue struct {
	SchoolID    string
	Name        string
	Category    string
	Description string
	Address     string
	Latitude    float64
	Longitude   float64
}

// SeedRating holds raw rating data for seeding.
type SeedRating struct {
	VenueIndex int // index into SeedVenues
	Score      float32
	Review     string
	Author     string
}

// SeedVenues contains real venues near popular college party schools.
var SeedVenues = []SeedVenue{
	// Arizona State University (104151) - Tempe, AZ
	{SchoolID: "104151", Name: "Casa de Wilde", Category: "bar", Description: "Legendary dive bar steps from ASU campus. $2 drinks on Wednesdays.", Address: "1 E 5th St, Tempe, AZ 85281", Latitude: 33.4245, Longitude: -111.9400},
	{SchoolID: "104151", Name: "Whiskey Row", Category: "bar", Description: "Multi-level country bar with rooftop patio. The go-to for game days.", Address: "410 S Mill Ave, Tempe, AZ 85281", Latitude: 33.4248, Longitude: -111.9393},
	{SchoolID: "104151", Name: "Mellow Mushroom", Category: "bar", Description: "Chill spot for craft beer and pizza. Great for day-drinking.", Address: "740 S Mill Ave, Tempe, AZ 85281", Latitude: 33.4215, Longitude: -111.9393},
	{SchoolID: "104151", Name: "Devil's Advocate", Category: "nightclub", Description: "High energy nightclub on Mill Ave. EDM nights every Friday.", Address: "640 S Mill Ave, Tempe, AZ 85281", Latitude: 33.4224, Longitude: -111.9393},

	// University of Florida (134130) - Gainesville, FL
	{SchoolID: "134130", Name: "Salty Dog Saloon", Category: "bar", Description: "The quintessential UF bar. Cheap pitchers and a packed patio.", Address: "1712 W University Ave, Gainesville, FL 32603", Latitude: 29.6520, Longitude: -82.3486},
	{SchoolID: "134130", Name: "Swamp Restaurant", Category: "bar", Description: "Gator-themed sports bar with massive outdoor area. Electric on game days.", Address: "1642 W University Ave, Gainesville, FL 32603", Latitude: 29.6519, Longitude: -82.3474},
	{SchoolID: "134130", Name: "Fat Daddy's", Category: "nightclub", Description: "The biggest club in Gainesville. Two floors, laser shows, huge sound system.", Address: "1702 W University Ave, Gainesville, FL 32603", Latitude: 29.6521, Longitude: -82.3483},
	{SchoolID: "134130", Name: "Midtown Social", Category: "bar", Description: "Trendy cocktail bar with a rooftop. Popular for date nights and pregames.", Address: "1728 W University Ave, Gainesville, FL 32603", Latitude: 29.6522, Longitude: -82.3490},

	// Penn State (214777) - State College, PA
	{SchoolID: "214777", Name: "Champs Downtown", Category: "bar", Description: "Massive sports bar on Beaver Ave. The spot for White Out weekend.", Address: "117 S Burrowes St, State College, PA 16801", Latitude: 40.7942, Longitude: -77.8594},
	{SchoolID: "214777", Name: "Cafe 210 West", Category: "bar", Description: "Iconic dive bar since 1988. Sticky floors and legendary memories.", Address: "210 W College Ave, State College, PA 16801", Latitude: 40.7945, Longitude: -77.8617},
	{SchoolID: "214777", Name: "Indigo", Category: "nightclub", Description: "State College's premier nightclub. DJs every weekend, bottle service.", Address: "112 W College Ave, State College, PA 16801", Latitude: 40.7944, Longitude: -77.8596},
	{SchoolID: "214777", Name: "Phyrst", Category: "bar", Description: "Underground bar with live music every night. A PSU institution since 1964.", Address: "111 E Beaver Ave, State College, PA 16801", Latitude: 40.7940, Longitude: -77.8570},

	// Ohio State University (204796) - Columbus, OH
	{SchoolID: "204796", Name: "Midway on High", Category: "bar", Description: "High Street staple with cheap drinks. Standing room only on game nights.", Address: "1610 N High St, Columbus, OH 43201", Latitude: 39.9919, Longitude: -83.0067},
	{SchoolID: "204796", Name: "Ethyl & Tank", Category: "bar", Description: "Dive bar with a great jukebox. Strong drinks and a no-frills vibe.", Address: "1636 N High St, Columbus, OH 43201", Latitude: 39.9925, Longitude: -83.0068},
	{SchoolID: "204796", Name: "The O Patio & Pub", Category: "bar", Description: "Massive patio bar right off campus. Best outdoor drinking in Columbus.", Address: "29 E Frambes Ave, Columbus, OH 43201", Latitude: 39.9950, Longitude: -83.0060},
	{SchoolID: "204796", Name: "Skully's Music-Diner", Category: "nightclub", Description: "Live music venue and nightclub. Theme nights from 80s to hip-hop.", Address: "1151 N High St, Columbus, OH 43201", Latitude: 39.9848, Longitude: -83.0059},

	// UT Austin (228778) - Austin, TX
	{SchoolID: "228778", Name: "Cain & Abel's", Category: "bar", Description: "UT's go-to bar on the Drag. Huge outdoor area and $3 you-call-its.", Address: "2313 Rio Grande St, Austin, TX 78705", Latitude: 30.2873, Longitude: -97.7485},
	{SchoolID: "228778", Name: "Dirty Bill's", Category: "bar", Description: "Cheap shots, loud music, packed dance floor. Peak college energy.", Address: "2209 Rio Grande St, Austin, TX 78705", Latitude: 30.2862, Longitude: -97.7480},
	{SchoolID: "228778", Name: "Barbarella", Category: "nightclub", Description: "Indie dance club on Red River. New Wave Tuesdays are legendary.", Address: "615 Red River St, Austin, TX 78701", Latitude: 30.2672, Longitude: -97.7369},
	{SchoolID: "228778", Name: "Moontower Saloon", Category: "bar", Description: "South Austin outdoor bar with food trucks and live music. Great vibes.", Address: "10212 Manchaca Rd, Austin, TX 78748", Latitude: 30.1720, Longitude: -97.8070},

	// University of Alabama (100751) - Tuscaloosa, AL
	{SchoolID: "100751", Name: "Gallettes", Category: "bar", Description: "The Strip classic. Packed to the rafters every Saturday in fall.", Address: "1021 University Blvd, Tuscaloosa, AL 35401", Latitude: 33.2108, Longitude: -87.5448},
	{SchoolID: "100751", Name: "Rounders", Category: "bar", Description: "Two-story bar with balcony overlooking the Strip. Great for people watching.", Address: "1415 University Blvd, Tuscaloosa, AL 35401", Latitude: 33.2087, Longitude: -87.5493},
	{SchoolID: "100751", Name: "Innisfree Irish Pub", Category: "bar", Description: "Best craft beer selection on the Strip. Live music on weekends.", Address: "1925 University Blvd, Tuscaloosa, AL 35401", Latitude: 33.2087, Longitude: -87.5530},
	{SchoolID: "100751", Name: "Houndstooth Sports Bar", Category: "bar", Description: "Bama sports bar packed on game days. Wings and beer specials.", Address: "1300 University Blvd, Tuscaloosa, AL 35401", Latitude: 33.2097, Longitude: -87.5473},

	// LSU (159391) - Baton Rouge, LA
	{SchoolID: "159391", Name: "Fred's Bar", Category: "bar", Description: "LSU institution on Highland Rd. Crawfish boils and cold beer.", Address: "1184 Bob Pettit Blvd, Baton Rouge, LA 70802", Latitude: 30.4112, Longitude: -91.1731},
	{SchoolID: "159391", Name: "Tigerland", Category: "nightclub", Description: "The entire strip of bars where LSU parties. Multiple clubs in one block.", Address: "1234 Bob Pettit Blvd, Baton Rouge, LA 70802", Latitude: 30.4115, Longitude: -91.1735},
	{SchoolID: "159391", Name: "Boo's Bar", Category: "bar", Description: "Dive bar with strong pours. Cash only and zero pretension.", Address: "1001 Nicholson Dr, Baton Rouge, LA 70802", Latitude: 30.4088, Longitude: -91.1818},
	{SchoolID: "159391", Name: "The Bulldog", Category: "bar", Description: "100+ beers on tap. Outdoor patio with misters for hot Louisiana nights.", Address: "4385 Perkins Rd, Baton Rouge, LA 70808", Latitude: 30.4050, Longitude: -91.1580},

	// University of Georgia (139959) - Athens, GA
	{SchoolID: "139959", Name: "Georgia Theatre", Category: "bar", Description: "Iconic rooftop bar with live music below. Best views in Athens.", Address: "215 N Lumpkin St, Athens, GA 30601", Latitude: 33.9604, Longitude: -83.3766},
	{SchoolID: "139959", Name: "Bourbon Street", Category: "nightclub", Description: "Athens' biggest dance club. Multiple rooms and a huge outdoor area.", Address: "294 W Washington St, Athens, GA 30601", Latitude: 33.9585, Longitude: -83.3805},
	{SchoolID: "139959", Name: "Allgood Lounge", Category: "bar", Description: "Chill bar with great cocktails. Upstairs from a pizza joint.", Address: "256 W Clayton St, Athens, GA 30601", Latitude: 33.9572, Longitude: -83.3792},
	{SchoolID: "139959", Name: "Magnolia's Bar", Category: "bar", Description: "Cheap drinks and a packed patio. The unofficial pregame HQ.", Address: "196 W Clayton St, Athens, GA 30601", Latitude: 33.9573, Longitude: -83.3782},

	// University of Wisconsin-Madison (240444) - Madison, WI
	{SchoolID: "240444", Name: "State Street Brats", Category: "bar", Description: "Madison's most famous bar. Brats, beer, and Badger game days.", Address: "603 State St, Madison, WI 53703", Latitude: 43.0740, Longitude: -89.3972},
	{SchoolID: "240444", Name: "KK Bar", Category: "bar", Description: "Legendary dive bar. $1 taps on Mondays. Small, loud, and perfect.", Address: "316 W Johnson St, Madison, WI 53703", Latitude: 43.0735, Longitude: -89.3945},
	{SchoolID: "240444", Name: "Wando's", Category: "bar", Description: "The bar on State Street. Three floors, rooftop, always packed.", Address: "602 University Ave, Madison, WI 53715", Latitude: 43.0738, Longitude: -89.3977},
	{SchoolID: "240444", Name: "DBLR", Category: "nightclub", Description: "Underground club with DJs. EDM and hip-hop rotation.", Address: "15 W Main St, Madison, WI 53703", Latitude: 43.0735, Longitude: -89.3860},

	// University of Michigan (170976) - Ann Arbor, MI
	{SchoolID: "170976", Name: "Rick's American Cafe", Category: "nightclub", Description: "THE Michigan nightclub. If you went to UMich, you went to Rick's.", Address: "611 Church St, Ann Arbor, MI 48104", Latitude: 42.2801, Longitude: -83.7456},
	{SchoolID: "170976", Name: "Charley's", Category: "bar", Description: "Cheap drinks, good music, packed on weekends. Classic college bar.", Address: "637 S State St, Ann Arbor, MI 48104", Latitude: 42.2729, Longitude: -83.7402},
	{SchoolID: "170976", Name: "Good Time Charley's", Category: "bar", Description: "Ann Arbor staple since 1979. Burgers, beer, and Big Ten sports.", Address: "1140 S University Ave, Ann Arbor, MI 48104", Latitude: 42.2745, Longitude: -83.7386},
	{SchoolID: "170976", Name: "Necto Nightclub", Category: "nightclub", Description: "Multi-room dance club. Different vibes each night from Latin to 90s.", Address: "516 E Liberty St, Ann Arbor, MI 48104", Latitude: 42.2791, Longitude: -83.7424},

	// USC (123961) - Los Angeles, CA
	{SchoolID: "123961", Name: "901 Bar & Grill", Category: "bar", Description: "The Trojan bar. Steps from campus. Pitchers and game day chaos.", Address: "901 W Jefferson Blvd, Los Angeles, CA 90007", Latitude: 34.0220, Longitude: -118.2870},
	{SchoolID: "123961", Name: "The Lab Gastropub", Category: "bar", Description: "Craft cocktails near campus. Upscale but still packed with students.", Address: "900 W Olympic Blvd, Los Angeles, CA 90015", Latitude: 34.0407, Longitude: -118.2714},
	{SchoolID: "123961", Name: "Banditos Tacos & Tequila", Category: "bar", Description: "Taco bar with 100+ tequilas. Margarita Monday is an institution.", Address: "3543 S Figueroa St, Los Angeles, CA 90007", Latitude: 34.0175, Longitude: -118.2780},
	{SchoolID: "123961", Name: "Exposition Park Bar", Category: "bar", Description: "Dive bar near the Coliseum. Strong drinks and a loyal crowd.", Address: "3901 S Figueroa St, Los Angeles, CA 90037", Latitude: 34.0135, Longitude: -118.2786},

	// Florida State University (134097) - Tallahassee, FL
	{SchoolID: "134097", Name: "Potbelly's", Category: "bar", Description: "FSU's favorite bar on the Strip. Bucket specials and party vibes.", Address: "721 W College Ave, Tallahassee, FL 32304", Latitude: 30.4404, Longitude: -84.2880},
	{SchoolID: "134097", Name: "Coliseum", Category: "nightclub", Description: "Tallahassee's biggest club. VIP sections, bottle service, big DJs.", Address: "731 W College Ave, Tallahassee, FL 32304", Latitude: 30.4405, Longitude: -84.2883},
	{SchoolID: "134097", Name: "Recess", Category: "bar", Description: "Outdoor bar and grill near campus. Food truck vibes with cold beer.", Address: "673 W Tennessee St, Tallahassee, FL 32304", Latitude: 30.4390, Longitude: -84.2875},
	{SchoolID: "134097", Name: "Bull's Tail Bar", Category: "bar", Description: "Sports bar with pool tables. Great wings and cheap pitchers.", Address: "619 W Tennessee St, Tallahassee, FL 32304", Latitude: 30.4395, Longitude: -84.2870},

	// CU Boulder (126614) - Boulder, CO
	{SchoolID: "126614", Name: "The Sink", Category: "bar", Description: "Boulder icon since 1923. Obama ate here. Famous burgers and beer.", Address: "1165 13th St, Boulder, CO 80302", Latitude: 40.0077, Longitude: -105.2779},
	{SchoolID: "126614", Name: "The Fox Theatre", Category: "nightclub", Description: "Historic venue with concerts and DJ nights. Intimate and loud.", Address: "1135 13th St, Boulder, CO 80302", Latitude: 40.0075, Longitude: -105.2779},
	{SchoolID: "126614", Name: "Sundown Saloon", Category: "bar", Description: "Beloved dive bar on the Hill. Cheap drinks and a pool table.", Address: "1136 Pearl St, Boulder, CO 80302", Latitude: 40.0178, Longitude: -105.2780},
	{SchoolID: "126614", Name: "Press Play", Category: "bar", Description: "Retro arcade bar with craft cocktails. Pac-Man and pinball.", Address: "1023 Walnut St, Boulder, CO 80302", Latitude: 40.0171, Longitude: -105.2778},

	// Indiana University (151351) - Bloomington, IN
	{SchoolID: "151351", Name: "Kilroy's on Kirkwood", Category: "bar", Description: "IU's most famous bar. Fishbowls and absolute mayhem on weekends.", Address: "502 E Kirkwood Ave, Bloomington, IN 47408", Latitude: 39.1664, Longitude: -86.5296},
	{SchoolID: "151351", Name: "Nick's English Hut", Category: "bar", Description: "Historic IU bar since 1927. Strombolis and bucket beers.", Address: "423 E Kirkwood Ave, Bloomington, IN 47408", Latitude: 39.1664, Longitude: -86.5306},
	{SchoolID: "151351", Name: "The Bluebird", Category: "nightclub", Description: "Live music venue and nightclub. Great sound, great shows.", Address: "216 N Walnut St, Bloomington, IN 47404", Latitude: 39.1695, Longitude: -86.5353},
	{SchoolID: "151351", Name: "Brothers Bar & Grill", Category: "bar", Description: "Big sports bar with multiple TVs. Great for watching games.", Address: "418 E Kirkwood Ave, Bloomington, IN 47408", Latitude: 39.1665, Longitude: -86.5309},

	// University of Iowa (153658) - Iowa City, IA
	{SchoolID: "153658", Name: "Brothers Bar & Grill", Category: "bar", Description: "Iowa City institution. Massive space with cheap drinks.", Address: "125 S Dubuque St, Iowa City, IA 52240", Latitude: 41.6593, Longitude: -91.5348},
	{SchoolID: "153658", Name: "The Airliner", Category: "bar", Description: "Classic bar above Hamburg Inn. Cheap pizza by the slice at 2am.", Address: "22 S Clinton St, Iowa City, IA 52240", Latitude: 41.6601, Longitude: -91.5352},
	{SchoolID: "153658", Name: "Summit Restaurant & Bar", Category: "bar", Description: "Upscale rooftop bar downtown. Best cocktails in Iowa City.", Address: "10 S Clinton St, Iowa City, IA 52240", Latitude: 41.6605, Longitude: -91.5349},
	{SchoolID: "153658", Name: "Studio 13", Category: "nightclub", Description: "Dance club with themed nights. Affordable and always a good time.", Address: "13 S Linn St, Iowa City, IA 52240", Latitude: 41.6600, Longitude: -91.5359},

	// Tulane (160755) - New Orleans, LA
	{SchoolID: "160755", Name: "The Boot", Category: "bar", Description: "THE Tulane bar. Cheap drinks, dancing, and pure NOLA college vibes.", Address: "1039 Broadway, New Orleans, LA 70118", Latitude: 29.9308, Longitude: -90.1201},
	{SchoolID: "160755", Name: "F&M Patio Bar", Category: "bar", Description: "Iconic New Orleans patio bar. Cash only, strong drinks, open late.", Address: "4841 Tchoupitoulas St, New Orleans, LA 70115", Latitude: 29.9213, Longitude: -90.1083},
	{SchoolID: "160755", Name: "Snake & Jake's Christmas Club Lounge", Category: "bar", Description: "Legendary dive bar. Christmas lights year-round. A NOLA rite of passage.", Address: "7612 Oak St, New Orleans, LA 70118", Latitude: 29.9269, Longitude: -90.1317},
	{SchoolID: "160755", Name: "The Columns Hotel", Category: "bar", Description: "Historic hotel bar with a stunning porch. Perfect for cocktail hour.", Address: "3811 St Charles Ave, New Orleans, LA 70115", Latitude: 29.9270, Longitude: -90.1070},

	// University of Miami (135726) - Coral Gables, FL
	{SchoolID: "135726", Name: "The Rat", Category: "bar", Description: "On-campus bar that every Cane has been to. Cheap and convenient.", Address: "1306 Stanford Dr, Coral Gables, FL 33146", Latitude: 25.7169, Longitude: -80.2789},
	{SchoolID: "135726", Name: "Titanic Brewing Company", Category: "bar", Description: "Craft brewery near campus. Great food and house-brewed beers.", Address: "5813 Ponce De Leon Blvd, Coral Gables, FL 33146", Latitude: 25.7228, Longitude: -80.2715},
	{SchoolID: "135726", Name: "Monty's Raw Bar", Category: "bar", Description: "Waterfront bar in Coconut Grove. Live music, sunset views, good food.", Address: "2550 S Bayshore Dr, Miami, FL 33133", Latitude: 25.7275, Longitude: -80.2374},

	// West Virginia University (238032) - Morgantown, WV
	{SchoolID: "238032", Name: "Fat Daddy's", Category: "nightclub", Description: "Morgantown's biggest party spot. Multiple floors and a packed dance floor.", Address: "381 High St, Morgantown, WV 26505", Latitude: 39.6290, Longitude: -79.9558},
	{SchoolID: "238032", Name: "Joe Mama's", Category: "bar", Description: "High Street staple. Cheap pitchers and a wild crowd on weekends.", Address: "335 High St, Morgantown, WV 26505", Latitude: 39.6286, Longitude: -79.9560},
	{SchoolID: "238032", Name: "Mario's Fishbowl", Category: "bar", Description: "Famous for their actual fishbowl drinks. A WVU must-visit.", Address: "704 Beechurst Ave, Morgantown, WV 26505", Latitude: 39.6350, Longitude: -79.9521},
	{SchoolID: "238032", Name: "Apothecary Ale House", Category: "bar", Description: "Craft beer bar with 30+ taps. More chill than the High Street scene.", Address: "456 High St, Morgantown, WV 26505", Latitude: 39.6295, Longitude: -79.9555},

	// UCSB (110705) - Santa Barbara, CA
	{SchoolID: "110705", Name: "Sharkeez", Category: "bar", Description: "State Street classic. Fish tacos, fishbowl drinks, and a packed patio.", Address: "416 State St, Santa Barbara, CA 93101", Latitude: 34.4165, Longitude: -119.6975},
	{SchoolID: "110705", Name: "EOS Lounge", Category: "nightclub", Description: "Santa Barbara's premier nightclub. DJs, bottle service, rooftop.", Address: "500 Anacapa St, Santa Barbara, CA 93101", Latitude: 34.4148, Longitude: -119.6935},
	{SchoolID: "110705", Name: "The Pickle Room", Category: "bar", Description: "Cozy speakeasy-style bar. Creative cocktails and dim lighting.", Address: "530 State St, Santa Barbara, CA 93101", Latitude: 34.4175, Longitude: -119.6978},
	{SchoolID: "110705", Name: "Sandbar", Category: "bar", Description: "Beach bar right on State St. Frozen drinks and a college crowd.", Address: "514 State St, Santa Barbara, CA 93101", Latitude: 34.4172, Longitude: -119.6976},

	// Syracuse University (196413) - Syracuse, NY
	{SchoolID: "196413", Name: "Chuck's Cafe", Category: "bar", Description: "The Syracuse bar. Literally everyone goes here on Thursday nights.", Address: "727 S Crouse Ave, Syracuse, NY 13210", Latitude: 43.0366, Longitude: -76.1313},
	{SchoolID: "196413", Name: "Faegan's Cafe & Pub", Category: "bar", Description: "Irish pub near campus with great wings and trivia nights.", Address: "734 S Crouse Ave, Syracuse, NY 13210", Latitude: 43.0364, Longitude: -76.1315},
	{SchoolID: "196413", Name: "DJ's on the Hill", Category: "bar", Description: "Dive bar on Marshall Street. Cheap drinks and a fun atmosphere.", Address: "215 Walton St, Syracuse, NY 13202", Latitude: 43.0492, Longitude: -76.1528},
	{SchoolID: "196413", Name: "Trexx", Category: "nightclub", Description: "Syracuse's dance club. Theme nights and a big dance floor.", Address: "323 N Clinton St, Syracuse, NY 13202", Latitude: 43.0520, Longitude: -76.1517},
}
